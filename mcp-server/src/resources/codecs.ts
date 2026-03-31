// Codec resource is registered via the protocols resource module.
// This file provides the codec catalog for direct import if needed.

export const CODEC_CATALOG = `panproto provides 50+ I/O codecs for parsing and emitting instance data.

Codecs are organized by pathway:

JSON pathway (SIMD-accelerated via simd-json):
  json, json-schema, geojson, json-api, atproto-lexicon, openapi, asyncapi

XML pathway (zero-copy via quick-xml):
  xml, html, svg, rss, atom, docx, odf, fhir-xml, naf

Tabular pathway (memchr-accelerated):
  csv, tsv, parquet, arrow, dataframe

Binary:
  protobuf, flatbuffers, avro, msgpack, bson, bond, asn1, thrift

Graph:
  graphql, neo4j-cypher

Relational:
  sql-ddl, sql-dml, cassandra-cql, dynamodb-json, redis-commands

Config:
  yaml, toml, hcl, k8s-crd, docker-compose, cloudformation, ansible

Domain:
  vcard, ical, edi-x12, swift-mt, conll-u, brat, ontonotes

Each codec implements InstanceParser (bytes to Instance) and InstanceEmitter (Instance to bytes).`;
