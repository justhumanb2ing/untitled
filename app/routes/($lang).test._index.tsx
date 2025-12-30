import React from "react";
import type { Route } from "./+types/($lang).test._index";
import prisma from "@/lib/prisma";

export async function loader({}: Route.LoaderArgs) {
  const tasks = await prisma.tasks.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      id: "desc",
    },
  });

  return { tasks };
}
export default function TestRoute({ loaderData }: Route.ComponentProps) {
  const { tasks } = loaderData;

  return (
    <main>
      <section>
        <h2>Tasks - Prisma</h2>
        {tasks.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>{task.name}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
