import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execCli } from "../cli.js";
import { CODEC_CATALOG } from "./codecs.js";
import { GRAMMAR_CATALOG } from "./grammars.js";

export function registerResources(server: McpServer): void {
  server.resource(
    "protocols",
    "panproto://protocols",
    async () => {
      try {
        const result = await execCli("validate", "--list-protocols");
        return {
          contents: [
            {
              uri: "panproto://protocols",
              mimeType: "text/plain",
              text: `panproto supports 50 semantic protocol definitions.\n\n${result}`,
            },
          ],
        };
      } catch {
        return {
          contents: [
            {
              uri: "panproto://protocols",
              mimeType: "text/plain",
              text: PROTOCOL_LIST,
            },
          ],
        };
      }
    }
  );

  server.resource("codecs", "panproto://codecs", async () => ({
    contents: [
      {
        uri: "panproto://codecs",
        mimeType: "text/plain",
        text: CODEC_CATALOG,
      },
    ],
  }));

  server.resource("grammars", "panproto://grammars", async () => ({
    contents: [
      {
        uri: "panproto://grammars",
        mimeType: "text/plain",
        text: GRAMMAR_CATALOG,
      },
    ],
  }));
}

const PROTOCOL_LIST = `panproto supports 50 semantic protocol definitions:

Serialization: Avro, FlatBuffers, ASN.1, Bond, MsgPack
Data Schema: JSON Schema, CDDL, BSON
API: OpenAPI, AsyncAPI, JSON:API, RAML
Database: SQL, MongoDB, Cassandra, DynamoDB, Neo4j, Redis
Social/Web: ATProto, RSS/Atom
Documents: DOCX, ODF
Data Science: Parquet, Arrow, DataFrame
Geospatial: GeoJSON
Healthcare: FHIR
Contact: vCard, iCal
Finance: EDI X12, SWIFT MT
Config: K8s CRD, Docker Compose, CloudFormation, Ansible
Annotation: brat, CoNLL-U, NAF, OntoNotes
Code: Protobuf, GraphQL, Thrift

Each protocol is a pair of GATs (Generalized Algebraic Theories) composed from building-block theories via colimit.`;
