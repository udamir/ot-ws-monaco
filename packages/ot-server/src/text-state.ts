import { IPlainTextOperation, PlainTextOperation, TPlainTextOperation } from "./plaintext";

export class TextState {
  private _operations: TPlainTextOperation[] = []
  private _snapshotRevision = 0

  public document: IPlainTextOperation
  public snapshot: IPlainTextOperation
  public revision: number = 0

  constructor(text: string) {
    this.document = PlainTextOperation.fromJSON([text])
    this.snapshot = this.document.clone()
  }

  public clientOperation(ops: TPlainTextOperation) {
    this._operations.push(ops)
    this.revision++
    this.document = this.document.compose(PlainTextOperation.fromJSON(ops))

    if (this._operations.length > 100) {
      this._operations = []
      this.snapshot = this.document.clone()
      this._snapshotRevision = this.revision
    }
  }

  public getOperations(revision = 0): TPlainTextOperation[] {
    return this._snapshotRevision <= revision || !revision ? this._operations.slice(revision - this.revision) : this._operations
  }

  public getSnapshot(revision = 0): TPlainTextOperation | undefined {
    return this._snapshotRevision >= revision ? this.snapshot.toJSON() : undefined
  }
}
