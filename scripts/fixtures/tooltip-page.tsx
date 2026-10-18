"use client";

import { useRef, useState } from "react";
import { TooltipButton } from "@/components/tooltip";
import BranchFields from "@/components/goals/branch-fields";
import { exampleActivities } from "@/lib/goal-activities";

export default function TooltipCheckPage() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [activity, setActivity] = useState(exampleActivities[0]);
  const [clicks, setClicks] = useState(0);
  return (
    <main className="p-8">
      <div className="flex gap-4">
        <TooltipButton
          aria-label="Primero"
          onClick={() => setClicks(clicks + 1)}
        >
          A
        </TooltipButton>
        <TooltipButton aria-label="Segundo">B</TooltipButton>
        <TooltipButton aria-label="Deshabilitado" title="Próximamente" disabled>
          C
        </TooltipButton>
        <button onClick={() => dialog.current?.showModal()}>
          Abrir detalles
        </button>
        <output>{clicks}</output>
      </div>
      <div className="mt-12 flex gap-4">
        <TooltipButton aria-label="Ajustar a pantalla">Ajustar</TooltipButton>
        <TooltipButton aria-label="Configuración de la vista">
          Configurar
        </TooltipButton>
        <TooltipButton aria-label="Arrastra para ordenar. Con teclado: flechas arriba y abajo. Usa Escape para cancelar y volver a la tarea seleccionada.">
          Ayuda larga
        </TooltipButton>
      </div>
      <dialog
        ref={dialog}
        className="m-auto w-[min(404px,100vw)] bg-black p-5 text-white"
      >
        <TooltipButton
          aria-label="Cerrar prueba"
          onClick={() => dialog.current?.close()}
        >
          ×
        </TooltipButton>
        <BranchFields
          activity={activity}
          onUpdate={(_, changes) => {
            setActivity((current) => ({ ...current, ...changes }));
            return true;
          }}
        />
      </dialog>
    </main>
  );
}
