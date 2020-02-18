This is proof-of-concept implementation. Do not use it in production. Details https://github.com/adrai/node-eventstore/issues/105

TODO:
* use per topic per aggregate;
* determine partitions by aggregate id (now we are using partition 0 of topic **events** always);
* implement different drivers for aggregate states storage (currently we're storing states in RAM, object);
* auto warm-up of out-to-date/empty aggregate states storage; detect if aggregate state was destroyed or out of sync;
* debug, tests, production use cases;

See also:
* https://github.com/adrai/node-cqrs-domain
* https://github.com/adrai/node-eventstore
* https://github.com/adrai/node-eventstore/issues/105
* https://www.confluent.io/blog/event-sourcing-cqrs-stream-processing-apache-kafka-whats-connection/
* https://blog.softwaremill.com/event-sourcing-using-kafka-53dfd72ad45d
* https://medium.com/serialized-io/apache-kafka-is-not-for-event-sourcing-81735c3cf5c
* https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/

