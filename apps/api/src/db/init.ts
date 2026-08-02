import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "./client";

const schema = readFileSync(resolve(import.meta.dir, "schema.sql"), "utf-8");
db.exec(schema);

console.log("Database initialized.");
