/**********************************************************************************/
/*                                                                                */
/*                                  Cycle Editor                                  */
/*                                                                                */
/**********************************************************************************/
let cycleEditor_ = { };
( function ( ) {

	class MoveRuleLeft extends UndoRedo.Commande {
		#_rule = null;
		constructor( cycle, rule ) {
			super ( cycle );
			this.#_rule = rule;
		}
		faire( ) {
			this.#_rule.moveUp ( );
		}
		defaire( ) {
			this.#_rule.moveDown ( );
		}
	}

	class MoveRuleRight extends UndoRedo.Commande {
		#_rule = null;
		constructor( cycle, rule ) {
			super ( cycle );
			this.#_rule = rule;
		}
		faire( ) {
			this.#_rule.moveDown ( );
		}
		defaire( ) {
			this.#_rule.moveUp ( );
		}
	}

	class MoveRuleTo extends UndoRedo.Commande {
		#_rule = null;
		#_toIndex = null;
		#_fromIndex = null;
		constructor( cycle, rule, fromIndex, toIndex ) {
			super ( cycle );
			this.#_rule = rule;
			this.#_toIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
			this.#_fromIndex = fromIndex;
		}
		faire( ) {
			this.#_rule.moveTo ( this.#_toIndex );
		}
		defaire( ) {
			this.#_rule.moveTo ( this.#_fromIndex );
		}
	}

	class CreateAndAddRule extends UndoRedo.Commande {
		#_rule = null;
		#_cycle = null;
		#_color = null;
		#_position = null;
		constructor( cycle, rule ) {
			super ( cycle );
			this.#_cycle = cycle;
			if ( rule ) {
				this.#_position = rule.position + 1;
			} else {
				this.#_position = cycle.nodeCyclePanel.children.length;
			}
			let color = colorManager_.createFullSaturatedRandomColor ( );
			let dir = Math.round ( Math.random ( ) ) * 2 - 1;
			this.#_rule = domCycleTools.createRule ( this.#_cycle, color, dir );
		}
		faire( ) {
			this.#_rule.insertAt ( this.#_position );
		}
		defaire( ) {
			this.#_rule.remove ( );
		}
	}

	class RemoveRule extends UndoRedo.Commande {
		#_rule = null;
		#_cycle = null;
		#_position = null;
		constructor( cycle, rule ) {
			super ( cycle );
			this.#_rule = rule;
			this.#_cycle = cycle;
			this.#_position = rule.position;
		}
		faire( ) {
			this.#_rule.remove ( );
		}
		defaire( ) {
			this.#_rule.insertAt ( this.#_position );
		}
	}


	class SetRuleColor extends UndoRedo.Commande {
		#_rule = null;
		#_color = null;
		constructor( cycle, rule, color ) {
			super ( cycle );
			this.#_rule = rule;
			this.#_color = color.clone ( );
		}
		#_changeColors( ) {
			let myOldColor = this.#_rule.color.clone ( );
			this.#_rule.setColor ( this.#_color.clone ( ) );
			this.#_color = myOldColor;
		}
		faire( ) {
			this.#_changeColors ( );
		}
		defaire( ) {
			this.#_changeColors ( );
		}
	}

	class SwapRuleDir extends UndoRedo.Commande {
		#_rule = null;
		constructor( cycle, rule ) {
			super ( cycle );
			this.#_rule = rule;
		}
		#_swap( ) {
			this.#_rule.swapDir ( );
		}
		faire( ) {
			this.#_swap ( );
		}
		defaire( ) {
			this.#_swap ( );
		}
	}

	class Manager {
		#_core = null;
		#_editorNode = null;
		#_eventsEnabled = false;
		#_editCancelBtn;
		#_editAcceptBtn;
		#_colorPicker;
		constructor( editorNode ) {
			this.#_editorNode = editorNode;
			let colorPickerHolder = this.#_editorNode.querySelector ( "#colorPickerHolder" );
			this.#_colorPicker = new colorPicker_.ColorPickerSystem ( colorPickerHolder );
		}
		open( cycle, onAcceptEditCallback, onRejectEditCallback ) {
			this.#_core = new Core ( cycle, this, this.#_colorPicker );
			this.#_core.onAcceptEditCallback = onAcceptEditCallback;
			this.#_core.onRejectEditCallback = onRejectEditCallback;
			this.#_editorNode.hidden = false;
			this.enableEvents ( );
			this.#_colorPicker.open ( );
		}
		close( ) {
			this.disableEvents ( );
			this.#_colorPicker.close ( );
			this.#_core = null;
			this.#_editorNode.hidden = true;
		}
		enableEvents( ) {
			if ( this.#_eventsEnabled ) return;
			this.#_eventsEnabled = true;
			document.addEventListener ( "keydown", this.#_core.onKeypress );
			this.#_editorNode.addEventListener ( "dblclick", this.#_core.onDblclick );
			this.#_editorNode.addEventListener ( "click", this.#_core.onClick );
		}
		disableEvents( ) {
			if ( ! this.#_eventsEnabled ) return;
			this.#_eventsEnabled = false;
			document.removeEventListener ( "keydown", this.#_core.onKeypress );
			this.#_editorNode.removeEventListener ( "dblclick", this.#_core.onDblclick );
			this.#_editorNode.removeEventListener ( "click", this.#_core.onClick );
		}
	}

	cycleEditor_ = new Manager ( document.querySelector ( "#cycleEditor" ) );
	function Core( fromCycle, rulesManager, colorPicker ) {

		const btnsStates = {
			"setUndo" : function ( b ) {
				setState ( "#undoEdit", b );
			},
			"setRedo" : function ( b ) {
				setState ( "#redoEdit", b );
			}
		};
		//==========================================================================================
		//=                                          Init                                          =
		//==========================================================================================
		const rulesDrag = {
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
		const rulesDomPanel = document.querySelector ( "#cycleEditorPanel" );
		clear ( rulesDomPanel );
		const cycleName = document.querySelector ( "#cycleName" );
		const newCycle = new domCycleTools.Cycle ( fromCycle.dataCycle.clone ( ), rulesDomPanel, [ ], rulesDrag );
		const myInvocateur = new UndoRedo.Invocateur ( newCycle, btnsStates );
		//==========================================================================================
		let isActive = true;
		let selectedRule = null;
		cycleName.innerHTML = " : " + newCycle.dataCycle.name;
		setBtnsState ( false );
		//==========================================================================================
		this.onAcceptEditCallback = function ( ) {};
		this.onRejectEditCallback = function ( ) {};
		//==========================================================================================

		colorPicker.onSelectTriangleCallback = onSelect;
		colorPicker.onSelectCircleCallback = onSelect2;
		colorPicker.onAcceptCallback = onAcceptColor;
		colorPicker.onRejectCallback = onRejectColor;

		function clear( panel ) {
			let range = document.createRange ( );
			range.selectNodeContents ( panel );
			range.deleteContents ( );
		}

		function onSelect( color ) {
			//console.log ( "Miaou", color );
		}
		function onSelect2( color ) {
			//console.log ( "Coucou", color );
		}
		function onAcceptColor( params ) {
			myInvocateur.exec ( new SetRuleColor ( newCycle, selectedRule, params ) );
		}
		function onRejectColor( params ) {
			console.log ( "Refusé" );
		}

		function doSelectRule( selectedNode, byClick ) {
			let newSelectedRule = newCycle.itemOf ( selectedNode );
			let lastSelectedCycle = selectedRule;
			doUnselectLastRule ( );
			if ( byClick && newSelectedRule === lastSelectedCycle ) {
				return;
			}
			selectedRule = newSelectedRule;
			selectedRule.selected = true;
			setBtnsState ( true );
		}

		function doUnselectLastRule( ) {
			if ( selectedRule && selectedRule.isSelected ) {
				selectedRule.selected = false;
				setBtnsState ( false );
			}
			selectedRule = null;
		}

		function setBtnsState( bState ) {
			setState ( [
				"#delRule",
				"#invertRule",
				"#leftShiftRule",
				"#rightShiftRule",
				"#ruleToText"
			], bState );
		}

		function cycleChanged() {
			return ! fromCycle.dataCycle.equals ( newCycle.dataCycle );
		}

		function acceptRequest() {
			isActive = false;
			if ( cycleChanged () ) {
				function valider() {
					console.log ( "Enregistrer" );
					acceptEdition ();
					isActive = true;
					rulesManager.close ();
				}
				function rienchanger() {
					console.log ( "Ne rien changer" );
					cancelEdition ();
					isActive = true;
					//rulesManager.close ();
				}
				let txt = "Voulez vous vraiment appliquer ces changements et quitter ?";
				let myPop = new YesNoPopup ( "Oui", "Non", "Attention", txt, valider, rienchanger );
			} else {
				console.log ( "Rien ne s'est passé" );
				cancelEdition ();
				rulesManager.close ();
			}
		}

		function requestCancel() {
			isActive = false;
			if ( cycleChanged () ) {
				function quitter() {
					console.log ( "Quitter sans enregistrer" );
					cancelEdition ();
					isActive = true;
					rulesManager.close ();
				}
				function nepasquitter() {
					isActive = true;
					console.log ( "Ne pas quitter" );
				}
				let txt = "Voulez vous vraiment quitter sans enregistrer ?";
				let myPop = new YesNoPopup ( "Oui", "Non", "Attention", txt, quitter, nepasquitter );
			} else {
				console.log ( "Rien ne s'est passé" );
				cancelEdition ();
				rulesManager.close ();
			}
		}

		cancelEdition = ( ) => {
			isActive = false;
			if ( this.onRejectEditCallback instanceof Function ) this.onRejectEditCallback ( fromCycle, newCycle );
		};
		acceptEdition = ( ) => {
			isActive = false;
			if ( this.onAcceptEditCallback instanceof Function ) this.onAcceptEditCallback ( fromCycle, newCycle );
		};

		function dataRuleToText( ) {
			selectedRule.toJSON ( );
		}

		function dataRulesToText( ) {
			newCycle.toJSON ( );
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
			doSelectRule ( e.target );
			//this.style.opacity = 0.5;
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
			if ( ! ( e.target && e.target.classList && e.target.classList.contains ( "rule" ) ) ) return;
			let toIndex = newCycle.itemOf ( e.target ).position;
			let orgIndex = selectedRule.position;
			if ( orgIndex === toIndex ) return;

			let m = e.clientX;
			let tgb = e.target.getBoundingClientRect ();
			if ( m > ( tgb.left + ( tgb.right - tgb.left ) / 2 ) ) {
				toIndex ++;
				//console.log ( "A droite : " + toIndex );
			} else {
				//console.log ( "A gauche : " + toIndex );
			}
			myInvocateur.exec ( new MoveRuleTo ( newCycle, selectedRule, orgIndex, toIndex ) );
			//doSelectRule ( e.target );
		}
		//==========================================================================================


		this.onDblclick = ( e ) => {

		};

		this.onClick = ( e ) => {
			if ( ! isActive ) return;
			e.stopPropagation ( );
			let target = e.target;
			// Condition pourrie
			if ( target === newCycle ) {
				//this.close ();
			} else {
				let tgcl = target.classList;
				switch ( true ) {
					case tgcl && tgcl.contains ( "rule" ):
						doSelectRule ( target, true );
						checkoutColorPicker ( );
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

		this.onKeypress = ( e ) => {
			if ( ! isActive ) return;
			//console.log("rulesManager : onKeypress");
			e.stopPropagation ( );
			switch ( e.key ) {
				case "-":
				case "Escape":
					requestCancel ();
					break;
				case "Delete":
					if ( ! selectedRule ) return;
					myInvocateur.exec ( new RemoveRule ( newCycle, selectedRule ) );
					break;
				case "ArrowLeft":
					if ( ! selectedRule ) return;
					myInvocateur.exec ( new MoveRuleLeft ( newCycle, selectedRule ) );
					break;
				case "ArrowRight":
					if ( ! selectedRule ) return;
					myInvocateur.exec ( new MoveRuleRight ( newCycle, selectedRule ) );
					break;
				case "+":
					myInvocateur.exec ( new CreateAndAddRule ( newCycle, selectedRule ) );
					break;
				case "s":
					break;
				case "z":
					if ( e.ctrlKey ) {
						if ( ! myInvocateur.canUndo ) return;
						myInvocateur.exec ( new UndoRedo.Undo ( newCycle ) );
					}
					break;
				case "y":
					if ( e.ctrlKey ) {
						if ( ! myInvocateur.canRedo ) return;
						myInvocateur.exec ( new UndoRedo.Redo ( newCycle ) );
					}
					break;
			}
		};

		function checkoutColorPicker( ) {
			if ( selectedRule ) {
				colorPicker.enabled = true;
				let items = colorPicker.selectHSBItems ( selectedRule.dataRule.color );
			} else {
				colorPicker.enabled = false;
			}
		}

		function checkoutMainBtns( id ) {
			switch ( id ) {
				case "closeCycleEditor" :
					requestCancel ();
					break;
				case "cancel-edit" :
					requestCancel ();
					break;
				case "accept-edit" :
					acceptRequest ();
					break;
			}
		}

		function checkoutBtnAction( id ) {
			switch ( id ) {
				case  "undoEdit" :
					if ( ! myInvocateur.canUndo ) return;
					myInvocateur.exec ( new UndoRedo.Undo ( newCycle ) );
					break;
				case  "redoEdit" :
					if ( ! myInvocateur.canRedo ) return;
					myInvocateur.exec ( new UndoRedo.Redo ( newCycle ) );
					break;
				case  "addRule" :
					myInvocateur.exec ( new CreateAndAddRule ( newCycle, selectedRule ) );
					break;
				case  "delRule" :
					if ( ! selectedRule ) return;
					myInvocateur.exec ( new RemoveRule ( newCycle, selectedRule ) );
					break;
				case  "invertRule" :
					if ( ! selectedRule ) return;
					myInvocateur.exec ( new SwapRuleDir ( newCycle, selectedRule ) );
					break;
				case  "leftShiftRule" :
					if ( ! selectedRule ) return;
					myInvocateur.exec ( new MoveRuleLeft ( newCycle, selectedRule ) );
					break;
				case  "rightShiftRule" :
					if ( ! selectedRule ) return;
					myInvocateur.exec ( new MoveRuleRight ( newCycle, selectedRule ) );
					break;
				case  "ruleToText" :
					dataRuleToText ( );
					break;
				case  "RulesToText" :
					dataRulesToText ( );
					break;
			}
		}
	}


} ) ( );



