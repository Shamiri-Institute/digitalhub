import "react-dom";

// TODO: remove when https://github.com/DefinitelyTyped/DefinitelyTyped/pull/66726 merged and released
declare module "react-dom" {
  function experimental_useFormState<State>(
    action: (state: State) => Promise<State>,
    initialState: State,
    permalink?: string
  ): [state: State, dispatch: () => void];
  function experimental_useFormState<State, Payload>(
    action: (state: State, payload: Payload) => Promise<State>,
    initialState: State,
    permalink?: string
  ): [state: State, dispatch: (payload: Payload) => void];
}
