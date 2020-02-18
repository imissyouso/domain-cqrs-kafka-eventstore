This is quck and dirty proof-of-concept implementation. Do not use it in production. Details https://github.com/adrai/node-eventstore/issues/105

TODO:
* use per topic per aggregate type;
* determine partitions by aggregate id (now we are using partition 0 of topic **events** always);
* implement different drivers for aggregate states storage (currently we're storing states in RAM, object);
* auto warm-up of out-to-date/empty aggregate states storage; detect if aggregate state was destroyed or out of sync;
* debug, tests, production use cases;

Usage:
```javascript
var domain = require('cqrs-domain')({
  	//...
	eventStore: createKafkaEventStore({
		ackTimeout: 3000, // when we save events to kafka we wait when we will receive them in consumer and only then saving considered completed. If consumer doesn't received it then we throw exception.
		client: {kafkaHost: 'kafka:9092'},
		sources: [
			//offset: 0
			{topic: 'events', partition: 0}
		],
		// See https://github.com/SOHU-Co/kafka-node for parameters description
		consumer: {
			groupId: 'test',//consumer group id, default `kafka-node-group`
			// Auto commit config
			autoCommit: true,
			autoCommitIntervalMs: 5000,
			// The max wait time is the maximum amount of time in milliseconds to block waiting if insufficient data is available at the time the request is issued, default 100ms
			fetchMaxWaitMs: 100,
			// This is the minimum number of bytes of messages that must be available to give a response, default 1 byte
			fetchMinBytes: 1,
			// The maximum bytes to include in the message set for this partition. This helps bound the size of the response.
			fetchMaxBytes: 1024 * 1024,
			// If set true, consumer will fetch message from the given offset in the payloads
			fromOffset: true,
			// If set to 'buffer', values will be returned as raw buffer objects.
			encoding: 'utf8',
			keyEncoding: 'utf8'
		}
	})
  	//...
});
```

See also:
* https://github.com/adrai/node-cqrs-domain
* https://github.com/adrai/node-eventstore
* https://github.com/adrai/node-eventstore/issues/105
* https://github.com/SOHU-Co/kafka-node
* https://www.confluent.io/blog/event-sourcing-cqrs-stream-processing-apache-kafka-whats-connection/
* https://blog.softwaremill.com/event-sourcing-using-kafka-53dfd72ad45d
* https://medium.com/serialized-io/apache-kafka-is-not-for-event-sourcing-81735c3cf5c
* https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/
