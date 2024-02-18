let cyclesManager_ = { };

/**********************************************************************************/
/*                                                                                */
/*                                 Cycles Manager                                 */
/*                                                                                */
/**********************************************************************************/
( function () {

	class ReplaceCycle extends UndoRedo.Commande {
		#_targetCycle = null;
		#_dataCycle = null;
		constructor( cycles, oldCycle, newCycle ) {
			super ( cycles );
			this.#_targetCycle = oldCycle;
			this.#_dataCycle = newCycle.dataCycle;
		}
		#_replace() {
			let saveDataCycle = this.#_targetCycle.dataCycle;
			this.#_targetCycle.replaceDataWith ( this.#_dataCycle );
			this.#_dataCycle = saveDataCycle;
		}
		faire() {
			this.#_replace ();
		}
		defaire() {
			this.#_replace ();
		}
	}

	class MoveCycleUp extends UndoRedo.Commande {
		#_cycle = null;
		constructor( cycles, cycle ) {
			super ( cycles );
			this.#_cycle = cycle;
		}
		faire() {
			this.#_cycle.moveUp ();
		}
		defaire() {
			this.#_cycle.moveDown ();
		}
	}

	class MoveCycleDown extends UndoRedo.Commande {
		#_cycle = null;
		constructor( cycles, cycle ) {
			super ( cycles );
			this.#_cycle = cycle;
		}
		faire() {
			this.#_cycle.moveDown ();
		}
		defaire() {
			this.#_cycle.moveUp ();
		}
	}

	class MoveCycleTo extends UndoRedo.Commande {
		#_cycle = null;
		#_toIndex = null;
		#_fromIndex = null;
		constructor( cycles, cycle, fromIndex, toIndex ) {
			super ( cycles );
			this.#_cycle = cycle;
			this.#_toIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
			this.#_fromIndex = fromIndex;
		}
		faire( ) {
			this.#_cycle.moveTo ( this.#_toIndex );
		}
		defaire( ) {
			this.#_cycle.moveTo ( this.#_fromIndex );
		}
	}

	class RemoveCycle extends UndoRedo.Commande {
		#_cycle = null;
		#_position = null;
		#_cycles = null;
		constructor( cycles, cycle ) {
			super ( cycles );
			this.#_cycle = cycle;
			this.#_position = cycle.position;
			this.#_cycles = cycles;
		}
		faire() {
			this.#_cycle.remove ();
		}
		defaire() {
			this.#_cycle.insertAt ( this.#_position );
		}
	}

	class CreateCycle extends UndoRedo.Commande {
		#_cycle = null;
		#_position = null;
		constructor( cycles, cycle, name ) {
			super ( cycles );
			if ( cycle ) {
				this.#_position = cycle.position + 1;
			} else {
				this.#_position = cycles.destinationNode.children.length;
			}
			this.#_cycle = domCycleTools.createNamedCycle ( cycles, { "name" : name, "rules" : [ ] } );
		}
		faire() {
			this.#_cycle.insertAt ( this.#_position );
			return this.#_cycle;
		}
		defaire() {
			this.#_cycle.remove ();
		}
	}

	class RenameCycle extends UndoRedo.Commande {
		#_cycle = null;
		#_name = null;
		#_cycles = null;
		constructor( cycles, cycle, name ) {
			super ( cycles );
			this.#_cycle = cycle;
			this.#_name = name;
			this.#_cycles = cycles;
		}
		#_rename() {
			let oldName = this.#_cycle.name;
			this.#_cycle.renameTo ( this.#_name );
			this.#_name = oldName;
		}
		faire() {
			this.#_rename ();
		}
		defaire() {
			this.#_rename ();
		}
	}

	class Manager {
		#_core = null;
		#_editorNode = null;
		#_eventsEnabled = false;
		constructor( editorNode ) {
			this.#_editorNode = editorNode;
		}
		open( dataCycles ) {
			this.#_core = new Core ( dataCycles, this );
			this.#_editorNode.hidden = false;
			this.enableEvents ();
		}
		close() {
			this.disableEvents ();
			this.#_core = null;
			this.#_editorNode.hidden = true;
		}
		enableEvents() {
			if ( this.#_eventsEnabled ) return;
			this.#_eventsEnabled = true;
			document.addEventListener ( "keydown", this.#_core.onKeypress.bind ( null, this ) );
			this.#_editorNode.addEventListener ( "click", this.#_core.onClick );
		}

		disableEvents() {
			if ( ! this.#_eventsEnabled ) return;
			this.#_eventsEnabled = false;
			document.removeEventListener ( "keydown", this.#_core.onKeypress.bind ( null, this ) );
			this.#_editorNode.removeEventListener ( "click", this.#_core.onClick );
		}
	}


	cyclesManager_ = new Manager ( document.querySelector ( "#cyclesManager" ) );

	function Core( dataCycles, cyclesManager ) {
		const btnsStates = {
			"setUndo" : function ( b ) {
				setState ( "#undoEditCycles", b );
			},
			"setRedo" : function ( b ) {
				setState ( "#redoEditCycles", b );
			}
		};
		//==========================================================================================
		//=                                          Init                                          =
		//==========================================================================================
		const cyclesDrag = {
			"onDrag" : onDrag,
			"onDragover" : onDragover,
			"onDragstart" : onDragstart,
			"onDragend" : onDragend,
			"onDragenter" : onDragenter,
			"onDragexit" : onDragexit,
			"onDragleave" : onDragleave,
			"onDrop" : onDrop
		};
		//==========================================================================================
		const cyclesDomPanel = document.querySelector ( "#cyclesPanel" );
		clear ( cyclesDomPanel );
		const cycles = new domCycleTools.Cycles ( dataCycles.clone (), cyclesDomPanel, cyclesDrag );
		const myInvocateur = new UndoRedo.Invocateur ( cycles, btnsStates );
		let isActive = true;
		let selectedCycle = null;
		//==========================================================================================

		function clear( panel ) {
			let range = document.createRange ( );
			range.selectNodeContents ( panel );
			range.deleteContents ( );
		}

		function doSelectCycle( selectedNode, byClick ) {
			let newSelectedCycle = cycles.itemOf ( selectedNode );
			let lastSelectedCycle = selectedCycle;
			doUnselectLastCycle ( );
			if ( byClick && newSelectedCycle === lastSelectedCycle ) {
				return;
			}
			selectedCycle = newSelectedCycle;
			selectedCycle.selected = true;
			selectedCycle.mainElementNode.scrollIntoView ( { behavior : "smooth", block : "end" } );
			setBtnsState ( true );
		}

		function doUnselectLastCycle( ) {
			if ( selectedCycle && selectedCycle.isSelected ) {
				selectedCycle.selected = false;
				setBtnsState ( false );
			}
			selectedCycle = null;
		}

		function setBtnsState( bState ) {
			setState ( [
				"#delCycle",
				"#editCycle",
				"#renameCycle",
				"#moveCycleUp",
				"#moveCycleDown",
				"#CycleToText",
				"#useCycle"
			], bState );
		}

		function useCycle( mySelectedCycle ) {
			let domDestination = document.querySelector ( "#couleurs-list" );
			let range = document.createRange ( );
			range.selectNodeContents ( domDestination );
			range.deleteContents ( );
			domCycleTools.createCycle ( mySelectedCycle.dataCycle, domDestination );
			myFourmi.loadNewCycle ( mySelectedCycle.dataCycle );
			closeMe ( );
		}

		function editCycle( ) {
			if ( selectedCycle ) {
				isActive = false;
				cycleEditor_.open ( selectedCycle, onAcceptEditCallback, onRejectEditCallback );
			}
		}

		function addCycle() {
			isActive = false;
			function create( name ) {
				let position = selectedCycle ? selectedCycle.position : null;
				let myNewCycle = myInvocateur.exec ( new CreateCycle ( cycles, selectedCycle, name ) );
				cycleEditor_.open ( myNewCycle, onAcceptEditCallback, onRejectEditCallback );
				//console.log ( myNewCycle );
				// Lancer l'éditeur de cycle

				//isActive = true;
			}
			function abort() {
				isActive = true;
			}
			let oldName = "Mon nouveau cycle";
			let myInput = new SimpleInput ( null, null, "Nommer le nouveau cycle", oldName, create, abort );
		}

		function renameCycyle( ) {
			if ( selectedCycle ) {
				isActive = false;
				function rename( name ) {
					myInvocateur.exec ( new RenameCycle ( cycles, selectedCycle, name ) );
					isActive = true;
				}
				function abort() {
					isActive = true;
				}
				let oldName = selectedCycle.name;
				let myInput = new SimpleInput ( null, null, "Renommer le cycle", oldName, rename, abort );
			}
		}

		function closeMe( ) {
			doUnselectLastCycle ( );
			selectedCycle = null;
			cyclesManager.close ( );
			isActive = false;
		}
		function cyclesChanged() {
			return ! dataCycles.equals ( cycles.dataCycles );
		}

		function requestCancel() {
			isActive = false;
			if ( cyclesChanged () ) {
				function quitter() {
					console.log ( "Quitter sans enregistrer" );
					//cancelEdition ();
					closeMe ();
				}
				function nepasquitter() {
					isActive = true;
					console.log ( "Ne pas quitter" );
				}
				let txt = "Voulez vous vraiment quitter sans enregistrer ?";
				let myPop = new YesNoPopup ( "Oui", "Non", "Attention", txt, quitter, nepasquitter );
			} else {
				console.log ( "Rien ne s'est passé" );
				//cancelEdition ();
				closeMe ( );
			}
		}
		function saveRequest() {
			isActive = false;
			if ( cyclesChanged () ) {
				function valider() {
					storeMyCycles(cycles.toJSON ());
					//localStorage.setItem ( "myCycles", JSON.stringify(cycles.toJSON ()) );
					console.log ( "Enregistrer" );
					console.log ( JSON.parse(localStorage.getItem ( "myCycles" )) );
					//acceptEdition ();
					isActive = true;
					closeMe ();
				}
				function rienchanger() {
					console.log ( "Ne rien changer" );
					//cancelEdition ();
					isActive = true;
				}
				let txt = "Voulez vous vraiment appliquer ces changements et quitter ?";
				let myPop = new YesNoPopup ( "Oui", "Non", "Attention", txt, valider, rienchanger );
			} else {
				//cancelEdition ();
				closeMe ( );
			}
		}

		function onAcceptEditCallback( oldCycle, newCycle ) {
			if ( ! oldCycle.dataCycle.equals ( newCycle.dataCycle ) ) {
				myInvocateur.exec ( new ReplaceCycle ( cycles, oldCycle, newCycle ) );
			}
			isActive = true;
		}

		function onRejectEditCallback( oldCycle, newCycle ) {
			isActive = true;
		}



		//==========================================================================================
		//=                                     Drag and Drop                                      =
		//==========================================================================================
		function onDrag( e ) {
			//console.log ( "drag" );
		}
		function onDragover( e ) {
			e.preventDefault ();
		}
		function onDragstart( e ) {
			//console.log ( "dragstart" );
			e.dataTransfer.dropEffect = "move";
			doSelectCycle ( e.target );
			//e.dataTransfer.setData("text/plain", "Text to drag");
		}
		function onDragend( e ) {
			//console.log ( "dragend" );
		}
		function onDragenter( e ) {
			//console.log ( "dragenter" );
		}
		function onDragexit( e ) {
			//console.log ( "dragexit" );
		}
		function onDragleave( e ) {
			//console.log ( "dragleave" );
		}
		function onDrop( e ) {
			if ( ! ( e.target && e.target.classList && e.target.classList.contains ( "namedCycle" ) ) ) return;
			let toIndex = cycles.itemOf ( e.target ).position;
			let orgIndex = selectedCycle.position;
			if ( orgIndex === toIndex ) return;

			let m = e.clientY;
			let tgb = e.target.getBoundingClientRect ();
			if ( m > ( tgb.top + ( tgb.bottom - tgb.top ) / 2 ) ) {
				toIndex ++;
			}
			myInvocateur.exec ( new MoveCycleTo ( cycles, selectedCycle, orgIndex, toIndex ) );
		}
		//==========================================================================================

		this.onClick = function ( e ) {
			e.stopPropagation ( );
			let target = e.target;
			// Condition ne marche pas
			if ( target === cyclesManager ) {
				requestCancel ( );
			} else {
				let tgcl = target.classList;
				switch ( true ) {
					case tgcl && tgcl.contains ( "namedCycle" ):
						doSelectCycle ( target, true );
						break;
					case tgcl && tgcl.contains ( "btnAction" ):
						checkoutBtnAction ( target.id );
						break;
					case tgcl && tgcl.contains ( "mainBtn" ):
						checkoutMainBtns ( target.id );
						break;
				}
			}
		};

		this.onKeypress = ( manager, e ) => {
			if ( ! isActive ) return;
			//console.log ( "cyclesManager : onKeypress" );
			e.stopPropagation ( );
			switch ( e.key ) {
				case "-":
				case "Escape":
					requestCancel ();
					break;
				case "Delete":
					if ( ! selectedCycle ) return;
					myInvocateur.exec ( new RemoveCycle ( cycles, selectedCycle ) );
					break;
				case "ArrowUp":
					if ( ! selectedCycle ) return;
					myInvocateur.exec ( new MoveCycleUp ( cycles, selectedCycle ) );
					break;
				case "ArrowDown":
					if ( ! selectedCycle ) return;
					myInvocateur.exec ( new MoveCycleDown ( cycles, selectedCycle ) );
					break;
				case "+":
					addCycle ();
					//myInvocateur.exec ( new CreateAndAddRule ( cycles, selectedCycle ) );
					break;
				case "s":
					break;
				case "z":
					if ( e.ctrlKey ) {
						if ( ! myInvocateur.canUndo ) return;
						myInvocateur.exec ( new UndoRedo.Undo ( cycles ) );
					}
					break;
				case "y":
					if ( e.ctrlKey ) {
						if ( ! myInvocateur.canRedo ) return;
						myInvocateur.exec ( new UndoRedo.Redo ( cycles ) );
					}
					break;
			}
		};

		function checkoutMainBtns( id ) {
			switch ( id ) {
				case "closeCyclesManager" :
					requestCancel ();
					break;
				case "quit-cyclesedit" :
					requestCancel ();
					break;
				case "save-cyclesedit" :
					saveRequest ();
					break;
			}

		}

		function checkoutBtnAction( id ) {
			switch ( id ) {
				case  "closeCyclesManager" :
					requestCancel ();
					break;
				case  "undoEditCycles" :
					if ( ! myInvocateur.canUndo ) return;
					myInvocateur.exec ( new UndoRedo.Undo ( cycles ) );
					break;
				case  "redoEditCycles" :
					if ( ! myInvocateur.canRedo ) return;
					myInvocateur.exec ( new UndoRedo.Redo ( cycles ) );
					break;
				case  "delCycle" :
					if ( ! selectedCycle ) return;
					myInvocateur.exec ( new RemoveCycle ( cycles, selectedCycle ) );
					break;
				case  "addCycle" :
					addCycle ();
					//myInvocateur.exec ( new RemoveCycle ( cycles, selectedCycle ) );
					break;
				case  "editCycle" :
					editCycle ( );
					break;
				case  "renameCycle" :
					renameCycyle ( );
					break;
				case  "moveCycleUp" :
					if ( ! selectedCycle ) return;
					myInvocateur.exec ( new MoveCycleUp ( cycles, selectedCycle ) );
					break;
				case  "moveCycleDown" :
					if ( ! selectedCycle ) return;
					myInvocateur.exec ( new MoveCycleDown ( cycles, selectedCycle ) );
					break;
				case  "CycleToText" :
					if ( selectedCycle ) {
						console.log ( selectedCycle.toJSON () );
					}
					break;
				case  "CyclesToText" :
					console.log ( cycles.toJSON () );
					break;
				case  "useCycle" :
					useCycle ( selectedCycle );
					break;
			}
		}

		// Init :
		setBtnsState ( false );
	}

} ) ( );


