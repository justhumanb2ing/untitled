import { getSupabaseClient } from "@/lib/supabase";
import React, { useState } from "react";

export default function UploadTest({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const supabase = getSupabaseClient();
  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    if (!file) return;
    event.preventDefault();
    console.log("click");
    try {
      setStatus("Uploading...");

      const { data, error } = await (await supabase).storage
        .from("untitled-bucket")
        .upload("test-image.png", file);

      console.log(data, error);
    } catch (err) {
      console.error(err);
      setStatus("Upload error");
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleUpload}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          accept="image/*"
        />
        <button type="submit">Upload</button>
        <p>{status}</p>
      </form>
    </div>
  );
}
