import { NewPersonaForm } from "./new-persona-form";

export const maxDuration = 60;

export default function NewPersonaPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">New persona</h1>
      <NewPersonaForm />
    </div>
  );
}
