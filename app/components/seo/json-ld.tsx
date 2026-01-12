import { useLocation, useMatches } from "react-router";

import type { JsonLdHandle, JsonLdNode } from "@/lib/json-ld";

type JsonLdProps = {
  data?: JsonLdNode | JsonLdNode[] | null;
  id?: string;
};

function normalizeNodes(value?: JsonLdNode | JsonLdNode[] | null) {
  if (!value) {
    return [];
  }

  const nodes = Array.isArray(value) ? value : [value];
  return nodes.filter((node): node is JsonLdNode => Boolean(node));
}

function stripContext(node: JsonLdNode): JsonLdNode {
  if (!Object.prototype.hasOwnProperty.call(node, "@context")) {
    return node;
  }

  const { "@context": _context, ...rest } = node;
  return rest;
}

export default function JsonLd({ data, id = "json-ld" }: JsonLdProps) {
  const location = useLocation();
  const matches = useMatches();
  const baseNodes = normalizeNodes(data).map(stripContext);
  const handleNodes = matches.flatMap((match) => {
    const handle = match.handle as JsonLdHandle | undefined;
    const jsonLd = handle?.jsonLd;
    if (!jsonLd) {
      return [];
    }

    const resolved =
      typeof jsonLd === "function"
        ? jsonLd({
            data: match.data,
            params: match.params,
            pathname: match.pathname ?? location.pathname,
          })
        : jsonLd;

    return normalizeNodes(resolved).map(stripContext);
  });
  const nodes = baseNodes.concat(handleNodes);

  if (nodes.length === 0) {
    return null;
  }

  const payload =
    nodes.length === 1
      ? { "@context": "https://schema.org", ...nodes[0] }
      : { "@context": "https://schema.org", "@graph": nodes };
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
