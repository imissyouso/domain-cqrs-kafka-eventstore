import {EventEmitter} from "events";
import * as kafka from "kafka-node";
import * as objectAssignDeep from "object-assign-deep";
import * as EventStream from "eventstore/lib/eventStream";
import * as Snapshot from "eventstore/lib/snapshot";
import uuid from "uuid";
import * as AggregateModel from "cqrs-domain/lib/aggregateModel";

export function createKafkaEventStore(options: any) {
    return () => {
        return new KafkaEventStore(options);
    }
}

export class KafkaEventStore extends EventEmitter {
    private eventMappings: any;
    private client;
    private consumer;
    private producer;
    // inmemory solution,
    // @todo change to something like redis
    private state;

    constructor(private readonly options: any) {
        super();

        this.state = {};
    }

    public async init(callback) {
        this.client = new kafka.KafkaClient(this.options.client);
        // @TODO later we will use kafka.HighLevelProducer
        this.producer = new kafka.Producer(this.client);
        this.consumer = new kafka.Consumer(
            this.client,
            this.options.sources,
            this.options.consumer
        );

        // @TODO: execute callback when states became up to date.
        this.consumer.on('message', (message) => {
            // @TODO may be better to use autoCommit = false adn commit it manually?
            const event = JSON.parse(message.value);

            if (!event.aggregateId || event.payload.command) {
                return;
            }

            const prevSnapshot = this.state[event.aggregateId] || {};
            const model = (new AggregateModel(event.aggregateId, event.payload.payload));

            model.setRevision({
                aggregateId: event.aggregateId,
                aggregate: event.aggregate,
                context: event.context,
            }, event.payload.revision);

            this.state[event.aggregateId] = new Snapshot(uuid(), objectAssignDeep(prevSnapshot, {
                aggregateId: event.aggregateId,
                aggregate: event.aggregate,
                context: event.context,
                revision: event.payload.revision - 1,
                version: event.payload.version,
                data: model.attributes
            }));

            this.emit('message', event);
        });

        this.producer.on('ready', () => {
            this.emit('connect');
            callback(null);
        });
    }

    public disconnect(callback) {
        this.consumer.close(true, () => {
            this.emit('disconnect');
            callback();
        });
    }

    public addEvents(events, callback) {
        const preparedEvents = events.map((ev) => {
            ev.id = uuid();
            return ev;
        });

        let queueToAck = events.map(ev => ev.id);
        const timeout = setTimeout(() => {
            this.off('message', listener);
            callback(new Error('Error while saving events to Kafka, acks didn\'t received!'));
        }, this.options.ackTimeout);

        const listener = (message) => {
            queueToAck = queueToAck.filter(obj => obj !== message.id);

            if (!queueToAck.length) {
                clearTimeout(timeout);
                this.off('message', listener);
                callback(null);
            }
        };

        this.on('message', listener);

        this.producer.send([{
            // @TODO: determine topic depends on aggregate
            topic: 'events',
            messages: preparedEvents.map(ev => JSON.stringify(ev)),
            // @TODO: determine partition number depends on aggregateId
            // key: 'theKey', // string or buffer, only needed when using keyed partitioner
            partition: 0,
            attributes: 0,
        }], (err) => {
            if (err) {
                callback(err);
            }
        });
    }

    public getFromSnapshot(query, revMax, callback) {
        if (typeof revMax === 'function') {
            callback = revMax;
        }

        if (typeof query === 'string') {
            query = {aggregateId: query};
        }

        if (!query.aggregateId) {
            const err = new Error('An aggregateId should be passed!');
            if (callback) callback(err);
            return;
        }

        callback(null, this.state[query.aggregateId] || null, new EventStream(this, query, []));
    }

    public createSnapshot(obj, callback) {
        throw new Error('Cannot create snapshots for kafka event store');
    }

    public setEventToDispatched(evt, callback) {
        // We don't implement and store eventsToDispatch array, it does not make sense, Kafka is a bus by itself.
        callback(null);
    }

    public defineEventMappings(mappings: any) {
        this.eventMappings = mappings;
        return this;
    }

    public commit(eventstream, callback) {
        // Allmost all copied from original eventstore lib
        const id = this.getNewId();

        let event,
            currentRevision = eventstream.currentRevision(),
            uncommittedEvents = [].concat(eventstream.uncommittedEvents);
        eventstream.uncommittedEvents = [];

        for (let i = 0, len = uncommittedEvents.length; i < len; i++) {
            event = uncommittedEvents[i];
            event.id = id + i.toString();
            event.commitId = id;
            event.commitSequence = i;
            event.restInCommitStream = len - 1 - i;
            event.commitStamp = new Date();
            currentRevision++;
            event.streamRevision = currentRevision;

            event.applyMappings();
        }

        this.addEvents(uncommittedEvents, function (err) {
            if (err) {
                // add uncommitted events back to eventstream
                eventstream.uncommittedEvents = uncommittedEvents.concat(eventstream.uncommittedEvents);
                return callback(err);
            }

            eventstream.eventsToDispatch = [];

            // move uncommitted events to events
            eventstream.events = eventstream.events.concat(uncommittedEvents);
            eventstream.currentRevision();

            callback(null, eventstream);
        });
    }

    public getNewId(callback?) {
        const id = uuid().toString();
        if (callback) callback(null, id);
    }
}
