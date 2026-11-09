export class UnreachableError extends Error {
  override name = "UnreachableError";
  constructor(unreachable: never, msg?: string, opts?: ErrorOptions) {
    super(msg ?? `encountered unreachable code. Expected \`never\`, got \`${unreachable}\`.`, opts);
  }
}
