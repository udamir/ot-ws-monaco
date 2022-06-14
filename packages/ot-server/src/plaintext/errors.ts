/* istanbul ignore file */

/**
 * Assertion Error: Error when an Assumption/Assertion Fails.
 */
export class AssertionError extends Error {
  readonly name: string = "Assertion Failed";
}

/**
 * No-op Error: Unexpected method call without any executable code.
 */
export class NoopError extends Error {
  readonly name: string = "No-op Encountered";
  readonly message: string = "This method should not have been called!";
}

/**
 * Invalid Operation Error: Executing an Invalid Operation.
 */
export class InvalidOperationError extends Error {
  readonly name: string = "Invalid Operation Encountered";
  readonly message: string =
    "The Operation recieved was either Invalid or Corrupted, please retry!";
}

/**
 * Transaction Failure Error: Failed to update some reference in Database.
 */
export class TransactionFailureError extends Error {
  readonly name: string = "Transaction Failure";
  readonly message: string = "Failed to update in the Database";
}

/**
 * DOM Failure Error: Failed to Query or Mutate some DOM Node.
 */
export class DOMFailureError extends Error {
  readonly name: string = "DOM Operation Failure";
  readonly message: string = "Failed to Query or Mutate some DOM Node";
}
