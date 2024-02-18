/**
 * @file Core
 * @author Prof. Chaos
 */


/**
 *
 * @param {String} msg
 * @param {Color} fgcolor
 * @param {Color} bgcolor
 * @returns {undefined}
 */
function debugMsg( msg, fgcolor, bgcolor ) {
	console.log ( `%c${ msg }`, `background-color: ${ bgcolor }; color: ${ fgcolor }` );
}

/**
 * @description Creates a new Fourmi
 * @class Fourmi
 * @this FourmiCore
 */
class FourmiCore {

	/**
	 * Rendering context
	 * @type {CanvasRenderingContext2D} #canvasCtx
	 * @memberOf FourmiCore
	 */
	#canvasCtx;
	#canvas;
	/**
	 *
	 * @type {ImageData} #imgData
	 * @memberOf FourmiCore
	 */
	#fourmiDom = null;
	#imgData = null;
	#infosCallback = null;
	#autoWalk = null;

	#running = false;
	#clock;
	#ticks = 0;
	#dispRate = 0;
	#opsRate = 0;
	#partialOps = 0;
	#totalOps = 0;
	#statRafr = 1000;
	#dispRafr = 30;
	#overSpd = 0;
	#usage = 0;
	#myClock = null;
	#uSz = { "g" : { }, "d" : { "lims" : { }, "intlims" : { } } };
	#sz = { };
	#antSz = null;
	#dc = { "dx" : 0, "dy" : 0 };
	#nbOps = null;
	#nbMilliSecs = null;

	#isBusy = false;
	#isRunning = false;

	/**
	 * A step color
	 * @typedef {Object} CycleColor
	 * @property {number} r Red (0-255)
	 * @property {number} g Green (0-255)
	 * @property {number} b Blue (0-255)
	 */
	/**
	 *	A step direction
	 * @type {number} CycleDirection (-1 ; 1)
	 */
	/**
	 * Cycle : colors and directions
	 * @typedef {Object} Cycle
	 * @property {Array<CycleColor>} colors
	 * @property {Array<CycleDirection>} directions
	 */


	/**
	 *
	 * @type {Array<CycleColor>}
	 */
	#colors = null;
	/**
	 *
	 * @type {Array<CycleDirection>}
	 */
	#dirs = null;
	/**
	 * @description Ant's path
	 * @type {Map}
	 */
	#cheminFourmi = new Map ( );
	/**
	 * @description Paths Array buffer
	 * @type {Array}
	 */
	#tampon = new Array ( );
	/**
	 *
	 * @description Ant current position
	 * @type {Object}
	 */
	#fourmi = {
		/**
		 *
		 * @alias fourmiPos.cds
		 * @type Array
		 */
		"cds" : [ 0, 0 ],
		/**
		 *
		 * @alias fourmiPos.dir
		 * @type Array
		 */
		"dir" : [ 0, 1, 0, - 1 ], // Ouest Nord Est Sud
		"color" : null
	};
	/**
	 * Last time when indicators was updated
	 * @type {Number}
	 */
	#lastUpdateTime = null;

	/**
	 *
	 * @param {HTMLCanvasElement} canvas
	 * @memberOf FourmiCore
	 * @returns {FourmiCore}
	 * @throws Will throw an error if the canvas is not HTMLCanvasElement.
	 */
	constructor( canvas ) {
		let support = canvas.parentNode;
		this.#canvas = canvas;
		this.#fourmiDom = document.createElement ( "div" );
		this.#fourmiDom.classList.add ( "fourmi" );
		this.#fourmiDom.dataset.orientation = this.#fourmi.dir;
		support.appendChild ( this.#fourmiDom );
		//console.log ( this.#fourmiDom );
		this.#canvasCtx = canvas.getContext ( "2d" );
		debugMsg ( "======[ Fourmi Core : Start (" + performance.now ( ) + ") ]======", "white", "darkgreen" );
		this.#buildMainClockCmd ();

		this.#imgData = this.#canvasCtx.getImageData ( 0, 0, canvas.width, canvas.height );
		this.#sz = {
			"width" : canvas.width, "height" : canvas.height
		};
		this.#updateSz ();
		this.#updateFourmiPos ();

	}

	get canGo() {
		return this.hasInterval && this.hasFrequency && this.hasCycle && this.hasAntSize;
	}
	get hasInterval() {
		return this.#nbMilliSecs > 0;
	}
	get hasFrequency() {
		return this.#nbOps > 0;
	}
	get hasCycle() {
		return this.#colors.length && this.#dirs.length;
	}
	get hasAntSize() {
		return this.#antSz > 0;
	}

	get isWalking() {
		return this.#autoWalk;
	}
	get isBusy() {
		return this.#isBusy;
	}
	set isBusy( b ) {
		this.#isBusy = ! ! b;
	}
	set areaSize( sz ) {
		//console.log ( "areaSize", sz );
		this.#sz = {
			"width" : sz.width, "height" : sz.height
		};
		this.#updateSz ();
		this.#updateFourmiPos ();
		this.#imgData = this.#canvasCtx.getImageData ( 0, 0, this.#sz.width, this.#sz.height );
	}

	set antSize( val ) {
		this.#antSz = val;
		this.#updateSz ();
		this.#updateFourmiPos ();
		this.#fourmiDom.style.height = val + "px";
		this.#fourmiDom.style.width = val + "px";
		this.#imgData = this.#canvasCtx.getImageData ( 0, 0, this.#sz.width, this.#sz.height );
	}
	set frequency( val ) {
		this.#nbOps = ( Math.sign ( this.#nbOps ) || 1 ) * val;
	}
	get frequency() {
		return this.#nbOps;
	}

	set interval( val ) {
		this.#nbMilliSecs = val;
		this.#myClock.speed = val;
	}
	get interval() {
		return this.#nbMilliSecs;
	}
	set dirs( d ) {
		this.#dirs = d;
	}
	set colors( c ) {
		this.#colors = c;
		this.#fourmi.color = this.#colors.length - 1;
	}
	set infosCallback( fct ) {
		this.#infosCallback = fct;
	}
	#buildMainClockCmd() {
		let self = this;
		this.#myClock = new bbClock ( {
			"onTick" : self.#autoWalkCallback.bind ( self ),
			"name" : "fourmi"
		} );
	}
	#initMainClock( data ) {
		let _nbMilliSecs = ( data && parseInt ( data.intervalle ) ) || Infinity;
		let _nbOps = ( data && parseInt ( data.nb ) ) || 1;
		if ( _nbOps > 0 && _nbMilliSecs > 0 ) {
			this.#nbOps = _nbOps;
			this.#nbMilliSecs = _nbMilliSecs;
		} else {
			//confirmBuild ("initMainClock", false);
		}
	}
	#updateSz() {
		let usz = this.#uSz;
		usz.g = {
			"x" : Math.floor ( this.#sz.width / 2 + this.#dc.dx - this.#antSz / 2 ),
			"y" : Math.floor ( this.#sz.height / 2 + this.#dc.dy - this.#antSz / 2 )
		};

		let h = usz.g.y;
		let b = this.#sz.height - h - this.#antSz;
		let g = usz.g.x;
		let d = this.#sz.width - g - this.#antSz;


		usz.d = { };
		// Limites données
		usz.d.lims = {
			"a" : {
				"x" : - Math.floor ( g / this.#antSz ),
				"y" : - Math.floor ( b / this.#antSz )
			},
			"b" : {
				"x" : Math.floor ( d / this.#antSz ),
				"y" : Math.floor ( h / this.#antSz )
			}
		};
		// Limites graphiques
		usz.g.intlims = {
			"p1" : {
				"x" : usz.d.lims.a.x * this.#antSz + usz.g.x,
				"y" : - usz.d.lims.b.y * this.#antSz + usz.g.y
			},
			"p2" : {
				"x" : ( usz.d.lims.b.x + 1 ) * this.#antSz + usz.g.x,
				"y" : - ( usz.d.lims.a.y - 1 ) * this.#antSz + usz.g.y
			}
		};
	}


	/**
	 *
	 * @returns {undefined}
	 */
	initFourmi( ) {
		requestAnimationFrame ( this.#regen.bind ( this ) );
		this.#myClock.start ();
	}
	checkAnt() {
		if ( ! ( this.#colors && this.#dirs ) ) {
			debugMsg ( "==[ FW start : Impossible de démarrer la fourmi ]==", "white", "darkred" );
			return false;
		}
		return true;
	}
	stopFourmi() {
		this.#autoWalk = false;
	}
	resetFourmi() {
		this.stopFourmi ();
		this.#initMainClock ();
		this.clearCanvas ();
		this.#updateGraph ();
		this.#updateSz ();
		this.#dirs = null;
		this.#colors = null;
		this.#cheminFourmi = new Map ( );
		this.#tampon = new Array ( );
		this.#fourmi = {
			"cds" : [ 0, 0 ],
			"dir" : [ 0, 1, 0, - 1 ], // Est Nord Ouest Sud
			"color" : null
		};
		this.#updateFourmiPos ();
	}
	stepBackward() {
		if ( ! this.checkAnt ) return;
		console.log ( "Step backward" );
		this.#stepWalk ( - 1 );
		this.#updateGraph ();
	}

	stepForward() {
		if ( ! this.checkAnt ) return;
		console.log ( "Step forward" );
		this.#stepWalk ( 1 );
		this.#updateGraph ();
	}

	goForward() {
		if ( ! this.checkAnt ) return;
		this.#lastUpdateTime = 0;
		if ( this.#nbOps < 0 ) this.#nbOps *= - 1;
		this.#autoWalk = true;
		console.log ( "Go forward" );

	}
	goBackward() {
		if ( ! this.checkAnt ) return;
		this.#lastUpdateTime = 0;
		if ( this.#nbOps > 0 ) this.#nbOps *= - 1;
		this.#autoWalk = true;
		console.log ( "Go backward" );
	}

	doZoom() {

	}

	#moving = false;
	#doEndMove() {
		if ( ! this.#moving )
			return;
		//myClock.softUnpause ();
		this.#moving = false;
		//fullPause = lastFullPauseState;
		//lastFullPauseState = null;
		//confirmAction ( "endmoving", true );
	}
	doMove( delta ) {
		if ( ! this.#moving ) {
			//lastFullPauseState = fullPause;
			//fullPause = true;
			//myClock.softPause ();
			this.#moving = true;
		}
		let tdc = {
			"dx" : Math.floor ( delta.dx ), "dy" : Math.floor ( delta.dy )
		};

		this.#canvasCtx.clearRect ( 0, 0, this.#sz.width, this.#sz.height );
		this.#canvasCtx.putImageData ( this.#imgData, tdc.dx, tdc.dy );
		this.#imgData = this.#canvasCtx.getImageData ( 0, 0, this.#sz.width, this.#sz.height );
		//offCanvas.beginPath ();

		this.#canvasCtx.clearRect ( 0, 0, this.#sz.width, tdc.dy );
		this.#canvasCtx.clearRect ( 0, 0, tdc.dx, this.#sz.height );
		this.#canvasCtx.clearRect ( 0, this.#sz.height + tdc.dy, this.#sz.width, tdc.dy + this.#sz.height );
		this.#canvasCtx.clearRect ( this.#sz.width + tdc.dx, 0, tdc.dx + this.#sz.width, this.#sz.height );


		//offCanvas.closePath ();

		let exSz = {
			"d1" : {
				"x" : this.#uSz.d.lims.a.x, "y" : this.#uSz.d.lims.a.y
			},
			"d2" : {
				"x" : this.#uSz.d.lims.b.x, "y" : this.#uSz.d.lims.b.y
			}
		};
		this.#dc.dx += tdc.dx;
		this.#dc.dy += tdc.dy;
		this.#updateSz ();
		this.#updateFourmiPos ();
		let newSz = {
			"d1" : {
				"x" : this.#uSz.d.lims.a.x, "y" : this.#uSz.d.lims.a.y
			},
			"d2" : {
				"x" : this.#uSz.d.lims.b.x, "y" : this.#uSz.d.lims.b.y
			}
		};

		let cadre1 = {
			"p1" : {
				"x" : tdc.dx > 0 ? newSz.d1.x : exSz.d2.x,
				"y" : tdc.dy > 0 ? exSz.d2.y : newSz.d1.y
			},
			"p2" : {
				"x" : tdc.dx > 0 ? exSz.d1.x : newSz.d2.x,
				"y" : tdc.dy > 0 ? newSz.d2.y : exSz.d1.y
			}
		};
		let cadre2 = {
			"p1" : {
				"x" : tdc.dx > 0 ? exSz.d1.x : newSz.d1.x,
				"y" : tdc.dy > 0 ? exSz.d2.y : newSz.d1.y
			},
			"p2" : {
				"x" : tdc.dx > 0 ? newSz.d2.x : exSz.d2.x,
				"y" : tdc.dy > 0 ? newSz.d2.y : exSz.d1.y
			}
		};
		let cadre3 = {
			"p1" : {
				"x" : tdc.dx > 0 ? newSz.d1.x : exSz.d2.x,
				"y" : tdc.dy > 0 ? newSz.d1.y : exSz.d1.y
			},
			"p2" : {
				"x" : tdc.dx > 0 ? exSz.d1.x : newSz.d2.x,
				"y" : tdc.dy > 0 ? exSz.d2.y : newSz.d2.y
			}
		};

		this.#redessinerCadres ( [ cadre1, cadre2, cadre3 ] );

	}


	doResize( newSz ) {
		if ( this.isBusy ) return;
		this.isBusy = true;

		let lastSz = { "g" : { "intlims" : { "p1" : { }, "p2" : { } } } };

		lastSz.d = this.#uSz.d;
		lastSz.g.x = this.#uSz.g.x;
		lastSz.g.y = this.#uSz.g.y;
		lastSz.g.intlims.p1.x = this.#uSz.g.intlims.p1.x;
		lastSz.g.intlims.p1.y = this.#uSz.g.intlims.p1.y;
		lastSz.g.intlims.p2.x = this.#uSz.g.intlims.p2.x;
		lastSz.g.intlims.p2.y = this.#uSz.g.intlims.p2.y;

		let img = this.#canvasCtx.getImageData (
				lastSz.g.intlims.p1.x,
				lastSz.g.intlims.p1.y,
				lastSz.g.intlims.p2.x - lastSz.g.intlims.p1.x,
				lastSz.g.intlims.p2.y - lastSz.g.intlims.p1.y
				);

		this.#canvas.width = Math.floor ( newSz.width );
		this.#canvas.height = Math.floor ( newSz.height );
		this.areaSize = { "width" : newSz.width, "height" : newSz.height };

		this.#canvasCtx.putImageData (
				img,
				this.#uSz.g.x - lastSz.g.x + lastSz.g.intlims.p1.x,
				this.#uSz.g.y - lastSz.g.y + lastSz.g.intlims.p1.y );

		this.#imgData = this.#canvasCtx.getImageData ( 0, 0, this.#sz.width, this.#sz.height );
		this.#redessinerManquant ( lastSz );



		this.isBusy = false;
	}


	/**
	 * @description Repaint function
	 * @param {number} tim
	 * @returns {undefined}
	 */
	#regen( tim ) {
		this.#dispRate ++;
		this.#updateInfos ( tim );
		this.#updateGraph ();
		requestAnimationFrame ( this.#regen.bind ( this ) );
	}
	#updateGraph() {
		this.#canvasCtx.putImageData ( this.#imgData, 0, 0 );
	}
	clearCanvas( ) {
		this.#canvasCtx.clearRect ( 0, 0, this.#sz.width, this.#sz.height );
		this.#imgData = this.#canvasCtx.getImageData ( 0, 0, this.#sz.width, this.#sz.height );
	}
	#redessinerCadre( cadre ) {
		let myBuffer = new Map ( );
		//let redessinés = 0;
		for ( let x = cadre.p1.x; x <= cadre.p2.x; x ++ ) {
			for ( let y = cadre.p1.y; y <= cadre.p2.y; y ++ ) {
				let _cds = [ x, y ].toString ( );
				let p = this.#cheminFourmi.get ( _cds );
				if ( p >= 0 )
					myBuffer.set ( _cds, p );
			}
		}
		this.#tampon.unshift ( [ myBuffer, true ] );
		this.#dessinerTampon ( this.#tampon );
	}

	#redessinerCadres( cadres ) {
		cadres.forEach ( function ( cadre ) {
			this.#redessinerCadre ( cadre );
		}.bind ( this ) );
	}

	#redessinerPartie( from_x, to_x, from_y, to_y ) {
		let myBuffer = new Map ( );
		for ( let i = from_x; i <= to_x; i ++ ) {
			for ( let j = from_y; j <= to_y; j ++ ) {
				let _cds = [ i, j ].toString ( );
				let p = this.#cheminFourmi.get ( _cds );
				if ( p >= 0 )
					myBuffer.set ( _cds, p );
			}
		}
		this.#tampon.unshift ( [ myBuffer, true ] );
		this.#dessinerTampon ( this.#tampon );
	}

	redessinerTout( ) {
		let newSz = {
			"d1" : {
				"x" : this.#uSz.d.lims.a.x, "y" : this.#uSz.d.lims.a.y
			},
			"d2" : {
				"x" : this.#uSz.d.lims.b.x, "y" : this.#uSz.d.lims.b.y
			}
		};
		let midX = Math.floor ( ( newSz.d2.x - newSz.d1.x ) / 2 ) + newSz.d1.x;
		let midY = Math.floor ( ( newSz.d2.y - newSz.d1.y ) / 2 ) + newSz.d1.y;
		this.#redessinerPartie ( midX, newSz.d2.x, midY, newSz.d2.y );
		this.#redessinerPartie ( midX, newSz.d2.x, newSz.d1.y, midY );
		this.#redessinerPartie ( newSz.d1.x, midX, midY, newSz.d2.y );
		this.#redessinerPartie ( newSz.d1.x, midX, newSz.d1.y, midY );
	}
	#redessinerManquant( lastSz ) {
		//console.log ( "manquant", lastSz );
		let omis = 0;
		let redessinés = 0;
		let myBuffer = new Map ( );
		//dessinerMap(#cheminFourmi);
		for ( let x = this.#uSz.d.lims.a.x; x <= this.#uSz.d.lims.b.x; x ++ ) {
			for ( let y = this.#uSz.d.lims.a.y; y <= this.#uSz.d.lims.b.y; y ++ ) {
				// lastSz contient les coordonnées à ne pas redessiner
				if ( lastSz && x > ( lastSz.d.lims.a.x ) &&
						x < ( lastSz.d.lims.b.x ) &&
						y > ( lastSz.d.lims.a.y ) &&
						y < ( lastSz.d.lims.b.y )
						) {
					let _cds = [ x, y ].toString ( );
					if ( this.#cheminFourmi.has ( _cds ) ) {
						omis ++;
					}
					continue;
				} else {
					let _cds = [ x, y ].toString ( );
					if ( this.#cheminFourmi.has ( _cds ) ) {
						redessinés ++;
						myBuffer.set ( _cds, this.#cheminFourmi.get ( _cds ) );
					}
				}
			}
		}
		this.#tampon.unshift ( [ myBuffer, false ] );
		this.#dessinerTampon ( this.#tampon );
	}

	#updateInfos( tim ) {
		if ( ( tim - this.#lastUpdateTime ) > this.#statRafr ) {
			this.#opsRate = Math.floor ( 1000 * this.#partialOps / ( tim - this.#lastUpdateTime ) );
			this.#partialOps = 0;
			if ( this.#infosCallback instanceof Function ) {
				this.#infosCallback ( {
					"dispRate" : this.#dispRate,
					"opsRate" : this.#opsRate,
					"totalOps" : this.#totalOps,
					"usage" : this.#usage,
					"bufferSize" : this.#tampon.length
				} );

			}
			this.#lastUpdateTime = tim;
			this.#dispRate = 0;
		}
	}

	#dessinerTampon( ceTampon ) {
		//console.log ("what ?");
		let t1 = performance.now ( );
		while ( ceTampon.length && ( ( performance.now () - t1 ) < this.#dispRafr ) ) {
			let miniTampon = ceTampon.shift ();
			miniTampon[0].forEach (
					this.#dispElement.bind ( this, miniTampon[1] )
					);
		}
	}

	renderElementClassic( RGBcouleur, lcds ) {
		let x = 4 * ( ( this.#uSz.g.y - lcds[1] * this.#antSz ) * this.#sz.width + this.#uSz.g.x + lcds[0] * this.#antSz );
		for ( let m = 0; m < this.#antSz; m ++ ) {
			let _m = m * 4 * this.#imgData.width;
			for ( let k = 0; k < this.#antSz; k ++ ) {
				this.#imgData.data.set ( RGBcouleur, 4 * k + x + _m );
			}
		}
	}
	renderElementPix( RGBcouleur, lcds ) {
		let x = 4 * ( ( this.#uSz.g.y - lcds[1] * this.#antSz ) * this.#sz.width + this.#uSz.g.x + lcds[0] * this.#antSz );
		this.#imgData.data.set ( RGBcouleur, x );
	}

	renderElement = this.renderElementClassic;
	#dispElement( direct, val, key ) {
		let cds = key.split ( "," );
		if ( direct ) {
			this.renderElementClassic ( this.#colors[val], cds );
			return;
		}
		if (
				cds[0] >= this.#uSz.d.lims.a.x &&
				cds[0] <= this.#uSz.d.lims.b.x &&
				cds[1] >= this.#uSz.d.lims.a.y &&
				cds[1] <= this.#uSz.d.lims.b.y
				) {
			this.renderElementClassic ( this.#colors[val], cds );
			return;
		}
	}

	#changerDirBackward( dir ) {
		switch ( dir ) {
			case - 1 :
				let k = this.#fourmi.dir.shift ( );
				this.#fourmi.dir.push ( k );
				break;
			case  1:
				let j = this.#fourmi.dir.pop ( );
				this.#fourmi.dir.unshift ( j );
				break;
		}
	}
	#changerDirForward( dir ) {
		switch ( dir ) {
			case 1 : // tourner à droite
				let k = this.#fourmi.dir.shift ( );
				this.#fourmi.dir.push ( k );
				break;
			case - 1: // tourner à gauche
				let j = this.#fourmi.dir.pop ( );
				this.#fourmi.dir.unshift ( j );
				break;
		}
	}
	#reculer() {
		this.#fourmi.cds = [
			this.#fourmi.cds[0] - this.#fourmi.dir[0],
			this.#fourmi.cds[1] - this.#fourmi.dir[1]
		];
	}
	#avancer() {
		this.#fourmi.cds = [
			this.#fourmi.cds[0] + this.#fourmi.dir[0],
			this.#fourmi.cds[1] + this.#fourmi.dir[1]
		];
	}
	#updateFourmiPos() {
		this.#fourmiDom.style.left = ( this.#uSz.g.x + this.#fourmi.cds[0] * this.#antSz ) + "px";
		//this.#fourmiDom.style.bottom = this.#uSz.g.y + ( this.#fourmi.cds[1] - 1 ) * this.#antSz + "px";
		//this.#fourmiDom.style.bottom = this.#uSz.g.y + ( this.#fourmi.cds[1] ) * this.#antSz + "px";
		this.#fourmiDom.style.top = ( this.#uSz.g.y - ( this.#fourmi.cds[1] ) * this.#antSz ) + "px";

		this.#fourmiDom.dataset.orientation = this.#fourmi.dir;
	}
	#goBackward( nbPas ) {
		let miniTampon = new Map ( );
		for ( let i = 0; i < nbPas; i ++ ) {

			this.#changerDirBackward ( this.#dirs[this.#fourmi.color] );

			this.#reculer ( );

			let currentColor = this.#cheminFourmi.get ( this.#fourmi.cds.toString ( ) );
			if ( currentColor === undefined )
				currentColor = this.#colors.length - 1;

			let prevCaseNextColor = ( this.#colors.length + currentColor - 1 ) % this.#colors.length;
			this.#fourmi.color = prevCaseNextColor;
			this.#cheminFourmi.set ( this.#fourmi.cds.toString ( ), prevCaseNextColor );
			miniTampon.set ( this.#fourmi.cds.toString ( ), prevCaseNextColor );
		}
		this.#totalOps += nbPas;
		this.#partialOps += nbPas;
		this.#tampon.push ( [ miniTampon, false ] );
		this.#updateFourmiPos ();
	}

	#goForward( nbPas ) {
		let miniTampon = new Map ( );
		for ( let i = 0; i < nbPas; i ++ ) {

			let prevCase = this.#fourmi.cds;

			this.#avancer ( );

			let currentColor = this.#cheminFourmi.get ( this.#fourmi.cds.toString ( ) );

			if ( currentColor === undefined )
				currentColor = this.#colors.length - 1;

			this.#changerDirForward ( this.#dirs[currentColor] );

			let prevCaseNextColor = ( this.#fourmi.color + 1 ) % this.#colors.length;
			this.#fourmi.color = currentColor;
			this.#cheminFourmi.set ( prevCase.toString ( ), prevCaseNextColor );
			miniTampon.set ( prevCase.toString ( ), prevCaseNextColor );
		}
		this.#totalOps += nbPas;
		this.#partialOps += nbPas;
		this.#tampon.push ( [ miniTampon, false ] );
		this.#updateFourmiPos ();
	}
	#overSpdFlag = false;

	#stepWalk( nbPas ) {
		if ( nbPas > 0 ) {
			this.#goForward ( nbPas );

		} else if ( nbPas < 0 ) {
			this.#goBackward ( - nbPas );
		}
		this.#dessinerTampon ( this.#tampon );
	}

	#autoWalkCallback( clk, numTick, nbTicks, nbPas ) {
		nbPas = nbPas || this.#nbOps;
		if ( this.#autoWalk ) {
			let opStart = performance.now ( );
			if ( nbPas > 0 ) {
				this.#goForward ( nbPas );

			} else if ( nbPas < 0 ) {
				this.#goBackward ( - nbPas );
			}
			let opEnd = performance.now ( );
			let tm = opEnd - opStart;
			if ( tm > this.#nbMilliSecs )
				this.#overSpdFlag = true;
			this.#usage = tm / this.#nbMilliSecs;
		} else {
			this.#usage = - 1;
		}
		if ( this.#overSpdFlag ) {
			this.#overSpd ++;
			this.#overSpdFlag = false;
		}
		this.#dessinerTampon ( this.#tampon );
	}

}