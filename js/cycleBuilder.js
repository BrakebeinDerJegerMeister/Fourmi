let masterCyclesManager = { };
let cyclesObjManager = { };
let cyclesCollection = [ ];
let domCycleTools = { };
let dataCycles = null;

( function ( ) {

	function format6( txt, nb, off ) {
		return txt + ( off ? "" : "-" ) + ( "" + nb ).padStart ( 6, "0" );
	}

	/*************************************************************************************
	 *                                                                                   *
	 *                                                                                   *
	 *                                  Classes data                                     *
	 *                                                                                   *
	 *                                                                                   *
	 *************************************************************************************/

	class CollectionItem {
		#_ofClass = null;
		#_parentCollection = null;
		constructor( ofClass, parentCollection ) {
			this.#_parentCollection = parentCollection;
			this.#_ofClass = ofClass;
		}
		get index( ) {
			//console.log("!!!!", this.#_parentCollection);
			return this.#_parentCollection.indexOf ( this );
		}
		item( index ) {
			return this.#_parentCollection[ index ];
		}
		get parentCollection() {
			return this.#_parentCollection;
		}
		moveElementUp( ) {
			let i = this.index;
			let n = ( this.#_parentCollection.length + i - 1 ) % this.#_parentCollection.length;
			let item = this.#_parentCollection.splice ( i, 1 )[0];
			this.#_parentCollection.splice ( n, - 1, item );
		}
		moveElementDown( ) {
			let i = this.index;
			let n = ( i + 1 ) % this.#_parentCollection.length;
			let item = this.#_parentCollection.splice ( i, 1 )[0];
			this.#_parentCollection.splice ( n, - 1, item );
		}
		removeElement( ) {
			let i = this.index;
			if ( i >= 0 ) {
				this.#_parentCollection.splice ( i, 1 );
			}
			return i;
		}
		insertElementAt( pos ) {
			this.#_parentCollection.splice ( pos, - 1, this );
		}
		replaceElementWith( newElement ) {
			let index = this.index;
			if ( index >= 0 ) {
				this.#_parentCollection[index] = newElement;
			}
		}
		moveElementAt( pos ) {
			let orgIndex = this.index;
			this.removeElement ();
			this.insertElementAt ( pos );
			/*if ( pos < orgIndex ) {
			 } else {
			 this.insertElementAt ( pos - 1 );
			 }*/
		}
	}

	class DataRule extends CollectionItem {
		static nb = 0;
		ref = null;
		#_color = null;
		#_dir = null;
		constructor( objRule, parentCollection ) {
			super ( DataRule, parentCollection );
			this.ref = format6 ( "DataRule", ++ DataRule.nb );
			this.shortRef = format6 ( "DtR", DataRule.nb, true );
			if ( objRule instanceof DataRule ) {
				this.#_color = objRule.color.clone ( );
				this.#_dir = objRule.dir;
			} else {
				let color = objRule[0];
				let dir = objRule[1];
				this.#_color = colorManager_.isColor ( color ) ? color : colorManager_.createColor ( color );
				this.#_dir = dir;
			}
		}
		get color( ) {
			return this.#_color;
		}
		set color( c ) {
			this.#_color = c;
		}
		get dir( ) {
			return this.#_dir;
		}
		set dir( d ) {
			this.#_dir = d;
		}
		swapDir( ) {
			this.dir = - this.#_dir;
			return this.dir;
		}
		clone( rulesCollection ) {
			return new DataRule ( this, rulesCollection || this.parentCollection );
		}
		equals( e ) {
			let re = ( e instanceof DataRule ) &&
					this.#_color.equals ( e.color ) &&
					this.#_dir == e.dir;
			return re;
		}
		toString( ) {
			return this.ref + " : (" + ( this.dir > 0 ? "D" : "G" ) + ") " + this.color.pick.toString ( );
		}
		toJSONstr( ) {
			return `\n    [ ${this.color.pick.toJSONstr ( )} ,${this.dir} ],`;
		}
		toJSON( ) {
			let rule = [ ];
			rule[0] = this.color.pick.toJSON ( );
			rule[1] = this.dir;
			return rule;
		}
	}

	class DataCycle extends CollectionItem {
		static nb = 0;
		ref = null;
		#_name = null;
		#_rulesCollection = [ ];
		constructor( objCycle, parentCollection ) {
			super ( DataCycle, parentCollection );
			this.ref = format6 ( "DataCycle", ++ DataCycle.nb );
			this.shortRef = format6 ( "DtC", DataCycle.nb, true );
			this.#_name = objCycle.name;
			if ( objCycle instanceof DataCycle ) {
				objCycle.rules.forEach ( ( dataRule ) => {
					this.#_rulesCollection.push ( dataRule.clone ( this.#_rulesCollection ) );
				} );
			} else {
				objCycle.rules.forEach ( ( objRule ) => {
					this.#_rulesCollection.push ( new DataRule ( objRule, this.#_rulesCollection ) );
				} );
			}
		}
		get name( ) {
			return this.#_name;
		}
		set name( n ) {
			this.#_name = n;
		}
		get rules( ) {
			return this.#_rulesCollection;
		}
		item( index ) {
			return this.#_rulesCollection[index];
		}
		clone( cyclesCollection ) {
			return new DataCycle ( this, cyclesCollection || this.parentCollection );
		}
		equals( e ) {
			let re = ( e instanceof DataCycle ) &&
					this.#_name == e.name &&
					this.#_collectionEquals ( e );
			return re;
		}
		toJSON( ) {
			let cycle = { };
			cycle.name = this.name;
			cycle.rules = this.rules.map ( ( rule ) => {
				return rule.toJSON ( ) ;
			} );
			return cycle;
		}
		#_collectionEquals( e ) {
			let re = this.#_rulesCollection.length && e.rules.length &&
					( this.#_rulesCollection instanceof Array ) && ( e.rules instanceof Array ) &&
					this.#_rulesCollection.length === e.rules.length &&
					this.#_rulesCollection.every ( ( element, i ) => {
						return element.equals ( e.rules[i] );
					} );
			return re;
		}
	}

	class DataCycles {
		static nb = 0;
		ref = null;
		#_cyclesCollection = [ ];
		constructor( objCycles ) {
			this.ref = format6 ( "DataCycles", ++ DataCycles.nb );
			this.shortRef = format6 ( "DtCs", DataCycles.nb, true );
			if ( objCycles instanceof DataCycles ) {
				objCycles.cycles.forEach ( ( dataCycle ) => {
					this.#_cyclesCollection.push ( dataCycle.clone ( this.#_cyclesCollection ) );
				} );
			} else {
				objCycles.forEach ( ( objCycle ) => {
					this.#_cyclesCollection.push ( new DataCycle ( objCycle, this.#_cyclesCollection ) );
				} );
			}
		}
		get cycles( ) {
			return this.#_cyclesCollection;
		}
		item( index ) {
			return this.#_cyclesCollection[index];
		}
		clone() {
			return new DataCycles ( this );
		}
		equals( e ) {
			let re = ( e instanceof DataCycles ) &&
					this.#_collectionEquals ( e );
			return re;
		}
		toJSON( ) {
			return this.#_cyclesCollection.map(function(dataCycle){
				return dataCycle.toJSON();
			});
		}
		#_collectionEquals( e ) {
			let re = this.#_cyclesCollection.length && e.cycles.length &&
					( this.#_cyclesCollection instanceof Array ) && ( e.cycles instanceof Array ) &&
					this.#_cyclesCollection.length === e.cycles.length &&
					this.#_cyclesCollection.every ( ( element, i ) => {
						return element.equals ( e.cycles[i] );
					} );
			return re;
		}
	}

	dataCycles = new DataCycles ( _cycles );
	delete _cycles;
	/*************************************************************************************
	 *                                                                                   *
	 *                                                                                   *
	 *                                Classes Finales                                    *
	 *                                                                                   *
	 *                                                                                   *
	 *************************************************************************************/

	class DomCollection {
		#_parentNode;
		#_dataElement;
		#_elementsCollection;
		constructor( dataElement, destinationNode, elementsCollection ) {
			this.#_parentNode = destinationNode;
			this.#_dataElement = dataElement;
			this.#_elementsCollection = elementsCollection;
		}
		set selected( bState ) {
			if ( bState ) {
				this.mainElementNode.setAttribute ( "selected", "true" );
			} else {
				this.mainElementNode.removeAttribute ( "selected" );
			}
		}
		get isSelected( ) {
			return this.mainElementNode.hasAttribute ( "selected" );
		}
		get position( ) {
			let p = this.#_index;
			if ( p === this.#_dataElement.index ) {
				return p;
			} else {
				throw new Error ( "@@@ pos @@@" );
			}
		}
		moveUp( ) {
			this.#_dataElement.moveElementUp ( );
			this.#_moveNodeUp ( );
		}
		moveDown( ) {
			this.#_dataElement.moveElementDown ( );
			this.#_moveNodeDown ( );
		}
		remove( ) {
			this.#_dataElement.removeElement ( );
			this.#_removeNode ( );
		}
		insertAt( pos ) {
			this.#_dataElement.insertElementAt ( pos );
			this.#_insertNodeAt ( pos );
		}
		moveTo( pos ) {
			if ( pos === this.#_index ) return;
			this.#_dataElement.moveElementAt ( pos );
			this.#_moveTo ( pos );
		}
		#_moveNodeUp( ) {
			let ref = this.mainElementNode.previousElementSibling;
			this.#_parentNode.insertBefore ( this.mainElementNode, ref );
		}
		#_moveNodeDown( ) {
			let ref = this.mainElementNode.nextElementSibling;
			if ( ref ) ref.insertAdjacentElement ( "afterend", this.mainElementNode );
			else this.#_parentNode.insertAdjacentElement ( "afterbegin", this.mainElementNode );
		}
		#_removeNode( ) {
			this.mainElementNode.remove ( );
			if ( ! this.#_elementsCollection.delete ( this.mainElementNode ) ) {
				throw new Error ( "@@@ rmv @@@" );
			}
		}
		#_insertNodeAt( pos ) {
			let range = document.createRange ( );
			range.setStart ( this.#_parentNode, pos );
			range.insertNode ( this.mainElementNode );
			this.#_elementsCollection.set ( this.mainElementNode, this );
		}
		#_moveTo( toPos ) {
			this.mainElementNode.remove ( );
			if ( toPos === this.#_parentNode.children.length ) {
				this.#_parentNode.appendChild ( this.mainElementNode );
			} else {
				let range = document.createRange ( );
				range.setStart ( this.#_parentNode, toPos );
				range.insertNode ( this.mainElementNode );
			}
		}
		get #_index( ) {
			return Array.prototype.indexOf.call ( this.#_parentNode.children, this.mainElementNode );
		}
	}

	class Rule extends DomCollection {
		static nb = 0;
		ref = null;
		dataRule;
		mainElementNode;
		nodeColor;
		nodeDir;
		destinationNode;
		constructor( dataRule, destinationNode, elementsCollection, rulesDrag ) {
			super ( dataRule, destinationNode, elementsCollection );
			this.ref = format6 ( "Rule", ++ Rule.nb );
			this.shortRef = format6 ( "R", Rule.nb, true );
			this.dataRule = dataRule;
			this.destinationNode = destinationNode;
			let template = document.querySelector ( "#ruleTemplate" );
			let imported = document.importNode ( template.content, true );
			this.mainElementNode = imported.querySelector ( ".rule" );
			this.nodeColor = this.mainElementNode.querySelector ( ".couleur" );
			this.nodeDir = this.mainElementNode.querySelector ( "svg" );
			if ( destinationNode ) this.destinationNode.appendChild ( this.mainElementNode );
			this.color = dataRule.color;
			this.dir = dataRule.dir;

			if ( rulesDrag ) {
				this.mainElementNode.ondrag = rulesDrag.onDrag;
				this.mainElementNode.ondragstart = rulesDrag.onDragstart;
				this.mainElementNode.ondragend = rulesDrag.onDragend;
				this.mainElementNode.ondragexit = rulesDrag.onDragexit;

				this.destinationNode.ondrop = rulesDrag.onDrop;
				this.destinationNode.ondragenter = rulesDrag.onDragenter;
				this.destinationNode.ondragleave = rulesDrag.onDragleave;
				this.destinationNode.ondragover = rulesDrag.onDragover;
			}
		}
		get color( ) {
			return this.dataRule.color;
		}
		set color( color ) {
			this.nodeColor.style.backgroundColor = color.rgb.toString ( );
		}
		set dir( dir ) {
			if ( dir === 1 ) this.nodeDir.classList.add ( "reverse" );
			else this.nodeDir.classList.remove ( "reverse" );
		}
		swapDir( ) {
			this.dataRule.swapDir ( );
			this.dir = this.dataRule.dir;
		}
		setColor( color ) {
			this.dataRule.color = color;
			this.color = color;
		}
		toJSON( ) {
			console.log ( this.ref );
			console.log ( this.dataRule );
		}
	}

	class Cycle extends DomCollection {
		static nb = 0;
		ref = null;
		dataCycle;
		mainElementNode;
		nodeCyclePanel;
		destinationNode;
		rulesDrag;
		rulesCollection = new Map ( );
		constructor( dataCycle, destinationNode, elementsCollection, rulesDrag ) {
			super ( dataCycle, destinationNode, elementsCollection, rulesDrag );
			this.ref = format6 ( "Cycle", ++ Cycle.nb );
			this.shortRef = format6 ( "C", Cycle.nb, true );
			this.dataCycle = dataCycle;
			this.rulesDrag = rulesDrag;
			this.destinationNode = destinationNode;

			let template = document.querySelector ( "#cycleTemplate" );
			let imported = document.importNode ( template.content, true );

			this.mainElementNode = imported.querySelector ( ".cycle" );
			this.nodeCyclePanel = imported.querySelector ( ".cycle" );

			this.#_populate ( this.nodeCyclePanel, rulesDrag );
			this.nodeCyclePanel.id = dataCycle.shortRef;

			destinationNode.appendChild ( this.mainElementNode );
		}
		get name() {
			return this.dataCycle.name;
		}
		itemOf( nodeElement ) {
			return this.rulesCollection.get ( nodeElement );
		}
		toJSON( ) {
			console.log ( this.dataCycle.ref );
			console.log ( this.dataCycle.rules );
		}
		#_populate( destination, rulesDrag ) {
			let range = document.createRange ();
			range.selectNodeContents ( destination );
			range.deleteContents ();
			this.dataCycle.rules.forEach ( ( dataRule ) => {
				let rule = new Rule ( dataRule, destination, this.rulesCollection, rulesDrag );
				this.rulesCollection.set ( rule.mainElementNode, rule );
			} );
		}
		replaceDataWith( dataCycle ) {
			this.dataCycle = dataCycle;
			this.#_populate ( this.nodeCyclePanel );
			this.rulesCollection = new Map ( );
		}
		renameTo( name ) {
			this.dataCycle.name = name;
			if ( this.nodeCycleName ) this.nodeCycleName.innerHTML = name;
		}
	}

	class NamedCycle extends Cycle {
		nodeCycleName;
		constructor( dataCycle, destinationNode, elementsCollection, cyclesDrag ) {
			super ( dataCycle, destinationNode, elementsCollection );
			let template = document.querySelector ( "#namedCycleTemplate" );
			let imported = document.importNode ( template.content, true );
			let nodeNamedCycle = imported.querySelector ( ".namedCycle" );

			this.nodeCycleName = nodeNamedCycle.querySelector ( ".cycleName>span" );
			this.nodeCycleName.innerHTML = dataCycle.name;
			nodeNamedCycle.append ( this.mainElementNode );

			this.mainElementNode = nodeNamedCycle;
			this.mainElementNode.id = "Main" + dataCycle.shortRef;

			destinationNode.appendChild ( this.mainElementNode );

			if ( cyclesDrag ) {
				this.mainElementNode.ondrag = cyclesDrag.onDrag;
				this.mainElementNode.ondragstart = cyclesDrag.onDragstart;
				this.mainElementNode.ondragend = cyclesDrag.onDragend;
				this.mainElementNode.ondragexit = cyclesDrag.onDragexit;

				this.destinationNode.ondrop = cyclesDrag.onDrop;
				this.destinationNode.ondragenter = cyclesDrag.onDragenter;
				this.destinationNode.ondragleave = cyclesDrag.onDragleave;
				this.destinationNode.ondragover = cyclesDrag.onDragover;
			}
		}
	}

	class Cycles {
		static nb = 0;
		ref = null;
		#_dataCycles;
		#_destinationNode;
		#_cyclesCollection = new Map ( );
		#_cyclesDrag = null;
		constructor( dataCycles, destinationNode, cyclesDrag ) {
			this.ref = format6 ( "Cycles", ++ Cycles.nb );
			this.shortRef = format6 ( "Cs", Cycles.nb, true );
			this.#_destinationNode = destinationNode;
			this.#_cyclesDrag = cyclesDrag;
			this.#_dataCycles = dataCycles;
			dataCycles.cycles.forEach ( ( dataCycle ) => {
				let namedCycle = new NamedCycle ( dataCycle, destinationNode, this.#_cyclesCollection, cyclesDrag );
				this.#_cyclesCollection.set ( namedCycle.mainElementNode, namedCycle );
			} );
		}
		get dataCycles() {
			return this.#_dataCycles;
		}
		get destinationNode() {
			return this.#_destinationNode;
		}
		get cyclesCollection() {
			return this.#_cyclesCollection;
		}
		get cyclesDrag() {
			return this.#_cyclesDrag;
		}
		toJSON( ) {
			return this.#_dataCycles.toJSON();
		}
		itemOf( nodeElement ) {
			return this.#_cyclesCollection.get ( nodeElement );
		}
	}

	domCycleTools = {
		"createNamedCycle" : function ( toCycles, jsonCycle ) {
			let refDataCycles = toCycles.dataCycles;
			let myDataCycle = new DataCycle(jsonCycle, refDataCycles.cycles);
			return new NamedCycle ( myDataCycle, toCycles.destinationNode, toCycles.cyclesCollection, toCycles.cyclesDrag );
		},
		"createCycle" : function ( dataCycle, destinationNode ) {
			return new Cycle ( dataCycle, destinationNode );
		},
		"createRule" : function ( toCycle, color, dir ) {
			let dataRule = new DataRule ( [ color, dir ], toCycle.dataCycle.rules );
			let myRule = new Rule ( dataRule, toCycle.nodeCyclePanel, toCycle.rulesCollection, toCycle.rulesDrag );
			return myRule;
		},
		"Rule" : Rule,
		"Cycle" : Cycle,
		"Cycles" : Cycles
	};
} ) ( );

cyclesManager_.open ( dataCycles );