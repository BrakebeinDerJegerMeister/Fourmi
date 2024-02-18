/**********************************************************************************/
/*                                                                                */
/*                                  Cycle Editor                                  */
/*                                                                                */
/**********************************************************************************/
let cycleEditor_ = { };

( function ( ) {
	let cycleName = document.querySelector ( "#cycleName" );
	let cycleEditor = document.querySelector ( "#cycleEditor" );
	let cycleDomPanel = document.querySelector ( "#cycleEditorPanel" );
	let selectedRule = null;
	let currentCycle = null;
	let myInvocateur = null;
	let editCancelBtn = document.querySelector ( "#cancel-edit" );
	let editAcceptBtn = document.querySelector ( "#accept-edit" );
	//==========================================================================================

	function setState( obj, state ) {
		if ( obj instanceof Array ) {
			obj.forEach ( function ( _obj ) {
				setState ( _obj, state );
			} );
		}
		let myObj = document.querySelector ( obj );
		if ( state ) {
			myObj.classList.remove ( "disabled" );
			myObj.classList.add ( "enabled" );
		} else {
			myObj.classList.add ( "disabled" );
			myObj.classList.remove ( "enabled" );
		}
	}

	let btnsStates = {
		set undo( b ) {
			setState ( "#undoEdit", b );
		},
		set redo( b ) {
			setState ( "#redoEdit", b );
		}
	};

	btnsStates.undo = false;
	btnsStates.redo = false;

	//==========================================================================================
	class CreateAndAddRule extends UndoRedo.Commande {
		#_color = null;
		#_domRule = null;
		#_dataRule = null;
		#_position = null;
		constructor( rule ) {
			super ( currentCycle );
			if ( rule ) {
				this.#_position = rule.index + 1;
				console.log ( this.#_position );
			} else {
				this.#_position = currentCycle.domCycle.rulePanel.children.length;
			}
			let color = colorManager_.createFullSaturatedRandomColor ();
			let dir = Math.round ( Math.random () ) * 2 - 1;
			this.#_dataRule = domCycleTools.createDataRule ( [ color, dir ] );
			this.#_domRule = domCycleTools.createDomRule ( this.#_dataRule, currentCycle.domCycle.rulePanel, false );
		}
		faire() {
			currentCycle.domCycle.insertDomRuleAt ( this.#_domRule, this.#_position );
			currentCycle.dataCycle.insertDataRuleAt ( this.#_dataRule, this.#_position );
		}
		defaire() {
			currentCycle.domCycle.removeDomRule ( this.#_domRule );
			currentCycle.dataCycle.removeDataRule ( this.#_dataRule );
			doUnselectRule ();
		}
	}

	class LeftShiftRule extends UndoRedo.Commande {
		#_domRule = null;
		#_dataRule = null;
		constructor( rule ) {
			super ( currentCycle );
			this.#_domRule = rule.domRule;
			this.#_dataRule = rule.dataRule;
		}
		faire() {
			currentCycle.domCycle.moveDomRuleUp ( this.#_domRule );
			currentCycle.dataCycle.moveDataRuleUp ( this.#_dataRule );
			updateSelectedRuleIndex ( this.#_domRule );
		}
		defaire() {
			currentCycle.domCycle.moveDomRuleDown ( this.#_domRule );
			currentCycle.dataCycle.moveDataRuleDown ( this.#_dataRule );
			updateSelectedRuleIndex ( this.#_domRule );
		}
	}

	class RightShiftRule extends UndoRedo.Commande {
		#_domRule = null;
		#_dataRule = null;
		constructor( rule ) {
			super ( currentCycle );
			this.#_domRule = rule.domRule;
			this.#_dataRule = rule.dataRule;
		}
		faire() {
			currentCycle.domCycle.moveDomRuleDown ( this.#_domRule );
			currentCycle.dataCycle.moveDataRuleDown ( this.#_dataRule );
			updateSelectedRuleIndex ( this.#_domRule );
		}
		defaire() {
			currentCycle.domCycle.moveDomRuleUp ( this.#_domRule );
			currentCycle.dataCycle.moveDataRuleUp ( this.#_dataRule );
			updateSelectedRuleIndex ( this.#_domRule );
		}
	}

	class RemoveRule extends UndoRedo.Commande {
		#_position = null;
		#_dataRule = null;
		#_domRule = null;
		constructor( rule ) {
			super ( currentCycle );
			this.#_domRule = rule.domRule;
			this.#_dataRule = rule.dataRule;
			this.#_position = rule.index;
		}
		faire() {
			currentCycle.domCycle.removeDomRule ( this.#_domRule );
			currentCycle.dataCycle.removeDataRule ( this.#_dataRule );
			doUnselectRule ();
		}
		defaire() {
			currentCycle.domCycle.insertDomRuleAt ( this.#_domRule, this.#_position );
			currentCycle.dataCycle.insertDataRuleAt ( this.#_dataRule, this.#_position );
		}
	}

	class SetRuleColor extends UndoRedo.Commande {
		#_dataRule = null;
		#_domRule = null;
		#_color = null;
		constructor( rule, color ) {
			super ( currentCycle );
			this.#_domRule = rule.domRule;
			this.#_dataRule = rule.dataRule;
			this.#_color = color.clone ();
		}
		#_changeColors() {
			let myOldColor = this.#_dataRule.color.clone ();
			let newColor = this.#_color.clone ();
			this.#_dataRule.color = newColor;
			this.#_domRule.color = newColor;
			this.#_color = myOldColor;
		}
		faire() {
			this.#_changeColors ();
		}
		defaire() {
			this.#_changeColors ();
		}
	}

	class SwapRuleDir extends UndoRedo.Commande {
		#_dataRule = null;
		#_domRule = null;
		constructor( rule ) {
			super ( currentCycle );
			this.#_domRule = rule.domRule;
			this.#_dataRule = rule.dataRule;
		}
		#_swap() {
			currentCycle.dataCycle.swapDataRuleDir ( this.#_dataRule );
			currentCycle.domCycle.swapDomRuleDir ( this.#_domRule );
		}
		faire() {
			this.#_swap ();
		}
		defaire() {
			this.#_swap ();
		}
	}

	//==========================================================================================

	colorPicker_.setCallbacks ( {
		"onSelectTriangleCallback" : onSelect,
		"onSelectCircleCallback" : onSelect2,
		"onAcceptCallback" : onAcceptColor,
		"onRejectCallback" : onRejectColor
	} );

	let callbacks = {
		"onAcceptEditCallback" : null,
		"onRejectEditCallback" : null
	};

	this.setCallbacks = function ( fcts ) {
		Object.entries ( fcts ).forEach ( ( [key, val] ) => {
			callbacks[ key ] = val;
		} );
	};

	function onSelect( color ) {
		//console.log ( "Miaou", color );
	}
	function onSelect2( color ) {
		//console.log ( "Coucou", color );
	}

	function onAcceptColor( params ) {
		myInvocateur.exec ( new SetRuleColor ( selectedRule, params ) );
	}

	function onRejectColor( params ) {
		console.log ( "Refusé" );
	}

	let dblclick = ( e ) => {
		e.stopPropagation ( );
		let target = e.target;
		if ( target === cycleEditor ) {
			this.close ( );
		}
	};

	let keypress = ( e ) => {
		//console.log ( e );
		e.stopPropagation ( );
		switch ( e.key ) {
			case "-":
			case "Delete":
				myInvocateur.exec ( new RemoveRule ( selectedRule ) );
				break;
			case "ArrowLeft":
				myInvocateur.exec ( new LeftShiftRule ( selectedRule ) );
				break;
			case "ArrowRight":
				myInvocateur.exec ( new RightShiftRule ( selectedRule ) );
				break;
			case "+":
				myInvocateur.exec ( new CreateAndAddRule ( selectedRule ) );
				break;
			case "s":
				break;
			case "z":
				if ( e.ctrlKey ) {
					if ( ! myInvocateur.canUndo ) return;
					myInvocateur.exec ( new UndoRedo.Undo ( currentCycle ) );
				}
				break;
			case "y":
				if ( e.ctrlKey ) {
					if ( ! myInvocateur.canRedo ) return;
					myInvocateur.exec ( new UndoRedo.Redo ( currentCycle ) );
				}
				break;
		}
	};

	let click = ( e ) => {
		e.stopPropagation ( );
		let target = e.target;
		if ( target === cycleEditor ) {
			this.close ();
		} else
		if ( target.classList && target.classList.contains ( "couleur" ) ) {
			doSelectRule ( target );
			// Créer une fonction pour selectionner selectHSBItems et afficher colorpicker
			if ( selectedRule ) {
				colorPicker_.enabled = true;
				let items = colorPicker_.selectHSBItems ( selectedRule.dataRule.color );
			} else {
				colorPicker_.enabled = false;
			}
		} else {
			switch ( target.id ) {
				case "closeCycleEditor" :
					this.close ( );
					break;
				case  "undoEdit" :
					if ( ! myInvocateur.canUndo ) return;
					myInvocateur.exec ( new UndoRedo.Undo ( currentCycle ) );
					break;
				case  "redoEdit" :
					if ( ! myInvocateur.canRedo ) return;
					myInvocateur.exec ( new UndoRedo.Redo ( currentCycle ) );
					break;
				case  "addRule" :
					myInvocateur.exec ( new CreateAndAddRule ( selectedRule ) );
					break;
				case  "delRule" :
					myInvocateur.exec ( new RemoveRule ( selectedRule ) );
					break;
				case  "invertRule" :
					myInvocateur.exec ( new SwapRuleDir ( selectedRule ) );
					break;
				case  "leftShiftRule" :
					myInvocateur.exec ( new LeftShiftRule ( selectedRule ) );
					break;
				case  "rightShiftRule" :
					myInvocateur.exec ( new RightShiftRule ( selectedRule ) );
					break;
				case  "ruleToText" :
					dataRuleToText ();
					break;
				case  "RulesToText" :
					dataRulesToText ();
					break;
			}
		}
	};

	function dataRuleToText() {
		if ( ! selectedRule ) return;
		console.log ( selectedRule.dataRule.toJSON () );
	}
	function dataRulesToText() {
		console.log ( currentCycle.dataCycle.toJSON () );
	}

	function updateSelectedRuleIndex( domRule ) {
		if ( ! selectedRule ) return;
		selectedRule.index = domRule.index;
	}
	function doSelectRule( nodeRule ) {
		let domRule = currentCycle.domCycle.itemOf ( nodeRule );
		let selectedDomRuleIndex = domRule.index;
		let dataRule = currentCycle.dataCycle.getRuleItem ( selectedDomRuleIndex );
		let lastNodeRule = selectedRule && selectedRule.nodeRule;
		doUnselectRule ( );
		if ( lastNodeRule === nodeRule ) return;
		domRule.selected = true;
		selectedRule = { };
		selectedRule.nodeRule = nodeRule;
		selectedRule.domRule = domRule;
		selectedRule.dataRule = dataRule;
		selectedRule.index = selectedDomRuleIndex;
		setState ( [
			"#delRule",
			"#invertRule",
			"#leftShiftRule",
			"#rightShiftRule",
			"#ruleToText"
		], true );
	}
	function doUnselectRule() {
		if ( selectedRule ) {
			selectedRule.domRule.selected = false;
		}
		selectedRule = null;
		setState ( [
			"#delRule",
			"#invertRule",
			"#leftShiftRule",
			"#rightShiftRule",
			"#ruleToText"
		], false );
	}
	function getAndRenderCycle( selectedCycle ) {
		currentCycle.domCycle = domCycleTools.createDomCycle ( currentCycle.dataCycle, cycleDomPanel );
		currentCycle.nodeCycle = currentCycle.domCycle.domElement;
	}
	function createAndRenderNewCycle() {
	}

	function cancelEdition() {
		if ( callbacks.onRejectEditCallback ) callbacks.onRejectEditCallback ( currentCycle );
	}

	function acceptEdition() {
		if ( callbacks.onAcceptEditCallback ) callbacks.onAcceptEditCallback ( currentCycle );
	}

	this.open = function ( selectedCycle ) {
		doUnselectRule ();
		currentCycle = {
			"dataCycle" : null,
			"domCycle" : null,
			"nodeCycle" : null
		};
		currentCycle.dataCycle = selectedCycle.dataCycle.clone ();
		let name = selectedCycle.dataCycle.name;
		cycleName.innerHTML = name ? " : " + name : "";
		selectedRule = null;

		cycleEditor.hidden = false;
		if ( selectedCycle && selectedCycle.dataCycle ) getAndRenderCycle ( selectedCycle );
		else createAndRenderNewCycle ();
		myInvocateur = new UndoRedo.Invocateur ( currentCycle, btnsStates );
		enableEvents ( );
		colorPicker_.open ();
	};

	this.close = function ( ) {
		doUnselectRule ( );
		currentCycle = null;
		selectedRule = null;
		myInvocateur = null;
		disableEvents ();
		colorPicker_.close ();
		cycleEditor.hidden = true;
	};

	let eventsEnabled = false;
	function enableEvents( ) {
		if ( eventsEnabled ) return;
		eventsEnabled = true;
		document.addEventListener ( "keydown", keypress );
		cycleEditor.addEventListener ( "dblclick", dblclick );
		cycleEditor.addEventListener ( "click", click );
		editCancelBtn.addEventListener ( "click", cancelEdition );
		editAcceptBtn.addEventListener ( "click", acceptEdition );
	}
	function disableEvents() {
		if ( ! eventsEnabled ) return;
		eventsEnabled = false;
		document.removeEventListener ( "keydown", keypress );
		cycleEditor.removeEventListener ( "dblclick", dblclick );
		cycleEditor.removeEventListener ( "click", click );
		editCancelBtn.removeEventListener ( "click", cancelEdition );
		editAcceptBtn.removeEventListener ( "click", acceptEdition );
	}

} ).bind ( cycleEditor_ ) ( );



