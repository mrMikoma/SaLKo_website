"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { callAction, isActionFailure } from "@/utilities/callAction";

/**
 * useActionState for a form whose server action answers with a state. A call
 * that throws (a lost connection, a page from before a deploy) gives
 * `onFailure`'s state with a Finnish message instead of the error page.
 *
 * React empties a form's fields whenever its `action` finishes, which suits
 * password fields. Where what was typed should stay after a failed save,
 * submit through `onSubmit` too: `<form action={action} onSubmit={onSubmit}>`.
 * The `action` then only matters before the page's script has loaded, when a
 * submit does nothing rather than send the fields in the address.
 */
export function useFormAction<State>(
  serverAction: (state: State, formData: FormData) => Promise<State>,
  initialState: State,
  onFailure: (message: string, state: State, formData: FormData) => State
) {
  // The states are plain objects, never promises, so Awaited<State> is State
  const [state, action, pending] = useActionState<State, FormData>(
    async (previous, formData) => {
      const answer = await callAction(() => serverAction(previous as State, formData));
      return isActionFailure(answer) ? onFailure(answer.error, previous as State, formData) : (answer as State);
    },
    initialState as Awaited<State>
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => action(formData));
  };

  return { state, action, onSubmit, pending };
}
