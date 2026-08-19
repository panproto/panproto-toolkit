import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CODEC_CATALOG } from "./codecs.js";
import { GRAMMAR_CATALOG } from "./grammars.js";

export function registerResources(server: McpServer): void {
  // The `schema` CLI has no protocol-listing command, so this resource is
  // served from the catalog below rather than from a subprocess.
  server.resource(
    "protocols",
    "panproto://protocols",
    async () => ({
      contents: [
        {
          uri: "panproto://protocols",
          mimeType: "text/plain",
          text: PROTOCOL_LIST,
        },
      ],
    })
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

const PROTOCOL_LIST = `panproto supports 54 built-in semantic protocol definitions, including 19 linguistic annotation protocols:

Serialization & IDLs: Avro, FlatBuffers, ASN.1, Bond, MessagePack Schema, Protobuf
Data Schema: JSON Schema, CDDL, BSON
API: OpenAPI, AsyncAPI, RAML, JSON:API, GraphQL
Database: SQL, MongoDB, Cassandra, DynamoDB, Neo4j, Redis
Web/Document: ATProto Lexicons, DOCX, ODF
Data Science: Parquet, Arrow, DataFrame
Domain: GeoJSON, FHIR, RSS/Atom, vCard/iCal, EDI X12, SWIFT MT
Config: Kubernetes CRDs, CloudFormation, Ansible
Annotation: AMR, bead, BRAT, Concrete, CoNLL-U, Decomp/UDS, ELAN, FoLiA, FOVEA, ISO-Space, LAF/GrAF, NAF, NIF, PAULA/Salt, TEI XML, TimeML, UCCA, UIMA/CAS, W3C Web Annotation
Raw file: Non-code files (README, LICENSE, images)

Additionally, 261 programming languages are supported via tree-sitter full-AST parsing, with each grammar auto-deriving a GAT theory.

Each protocol is a pair of GATs (Generalized Algebraic Theories) composed from building-block theories via colimit.`;
