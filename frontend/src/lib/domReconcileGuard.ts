/**
 * React 19 + extensions / mode appareil Chrome
 * peuvent déplacer des nœuds hors de l'arbre que React croit encore parent.
 * insertBefore/removeChild jettent alors une NotFoundError et cassent l'UI.
 */
let installed = false;

export function installDomReconcileGuard() {
  if (installed || typeof Node === "undefined") return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
