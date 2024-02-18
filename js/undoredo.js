let UndoRedo = { };
( function () {
	/********************************
	 *                              *
	 *          Undo / Redo         *
	 *                              *
	 ********************************/
	class Invocateur {
		#_hist = [ ];
		#_redo = [ ];
		#_target = null;
		#_btnsStates = null;
		constructor( target, btnsStates ) {
			this.#_target = target;
			this.#_btnsStates = {
				"setUndo" : btnsStates.setUndo || null,
				"setRedo" : btnsStates.setRedo || null
			};
			this.updateBtns ();
		}
		exec( cmd ) {
			if ( cmd instanceof Commande ) {
				if ( cmd.target !== this.#_target ) {
					throw new Error ( "Erreur d'invocateur" );
				}
				let ret = cmd.exec ( this );
				this.updateBtns ();
				return ret;
			} else {
				throw new Error ( "Pas une commande" );
			}
		}
		updateBtns() {
			if (this.#_btnsStates.setUndo) this.#_btnsStates.setUndo( ! ! this.canUndo);
			if (this.#_btnsStates.setRedo) this.#_btnsStates.setRedo( ! ! this.canRedo);
		}
		get canUndo() {
			return ! ! this.#_hist.length;
		}
		get canRedo() {
			return ! ! this.#_redo.length;
		}
		clearHist() {
			this.#_hist = [ ];
		}
		clearRedo() {
			this.#_redo = [ ];
		}
		get hist() {
			return this.#_hist;
		}
		get redo() {
			return this.#_redo;
		}
	}

	class Commande {
		#_target = null;
		constructor( target ) {
			this.#_target = target;
		}
		get target() {
			return this.#_target;
		}
		exec( inv ) {
			if ( inv.canRedo ) {
				inv.clearRedo ();
			}
			inv.hist.push ( this );
			return this.faire ();
		}
		faire() {
			console.log ( "===[ " + this.constructor.name + " ]===", "faire() : fonction non définie" );
		}
		defaire() {
			console.log ( "===[ " + this.constructor.name + " ]===", "defaire() : fonction non définie" );
		}
	}

	class Undoable extends Commande {
		constructor( target ) {
			super ( target );
		}
	}

	class Undo extends Undoable {
		constructor( target ) {
			super ( target );
		}
		exec( inv ) {
			//console.log ( "Undo demandé" );
			if ( inv.canUndo ) {
				let cmd = inv.hist.pop ();
				inv.redo.push ( cmd );
				cmd.defaire ();
			} else {
				console.log ( "Erreur : Undo impossible" );
			}
		}
	}

	class Redo extends Undoable {
		constructor( target ) {
			super ( target );
		}
		exec( inv ) {
			//console.log ( "Redo demandé" );
			if ( inv.canRedo ) {
				let cmd = inv.redo.pop ();
				inv.hist.push ( cmd );
				cmd.faire ();
			} else {
				console.log ( "Erreur : Redo impossible" );
			}
		}
	}

	this.Invocateur = Invocateur;
	this.Undo = Undo;
	this.Redo = Redo;
	this.Commande = Commande;

} ).bind ( UndoRedo ) ();
