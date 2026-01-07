import { useEffect, useState } from "react";

type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
};

type Props = {
  onSelect: (center: [number, number]) => void;
};

// TODO: locale에 따라서, place_name_en 또는 place_name_ko 결과에 출력하도록
export function MapSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}&language=ko,en&limit=5&autocomplete=true&types=country,place&format=v5`,
          { signal: controller.signal }
        );

        const json = await res.json();
        console.log(json);
        setResults(json.features ?? []);
      } catch {
        // ignore abort
      } finally {
        setLoading(false);
      }
    }, 500); // debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="위치 검색"
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />

      {results.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            borderRadius: 8,
            marginTop: 4,
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            zIndex: 10,
          }}
        >
          {results.map((r) => (
            <li
              key={r.id}
              onClick={() => {
                onSelect(r.center);
                setQuery(r.place_name);
                setResults([]);
              }}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              {r.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
