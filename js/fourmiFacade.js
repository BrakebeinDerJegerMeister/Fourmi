class Fourmi {
	static fourmis = [ ];
	static resizeObs = new ResizeObserver ( function ( entries ) {
		entries.forEach ( function ( entry ) {
			if ( entry.target.callback ) {
				entry.target.callback ( entry.target );
			}
		} );
	} );
	static muls = [ 1, 2, 3, 5, 7 ];
	autoresize = true;
	cvDest = null;
	canvas = null;
	isReady = false;
	isRunning = false;
	#sz = null;
	#zoomLevel = null; // 4;
	/**
	 *
	 * @type {FourmiCore}
	 */
	#core = null;
	constructor( dest ) {
		Fourmi.fourmis.push ( this );
		this.#createCanvas ( );
		this.#core = new FourmiCore ( this.canvas );
		this.#setZoom ( 8 );
		this.applySpeed ( 1, 100 );
		this.#core.initFourmi ( );
	}

	#szObserve( obj, callback ) {
		obj.callback = callback;
		Fourmi.resizeObs.observe ( obj );
	}

	buildCommands( commandPanel ) {
		let self = this;
		commandPanel.addEventListener ( "click", this.commandCenter.bind ( this ) );
	}
	commandCenter( e ) {
		let target = e.target;
		//console.log ( target );
		if ( e.target.name && e.target.id ) {
			let name = e.target.name;
			let cmd = e.target.id;
			switch ( name ) {
				case "control" :
					switch ( cmd ) {
						case "autobackwardbtn" :
							this.autoBackward ( );
							break;
						case "stepbackwardbtn" :
							this.stepBackward ( );
							break;
						case "stopbtn" :
							this.stop ( );
							break;
						case "stepforwardbtn" :
							this.stepForward ( );
							break;
						case "autoforwardbtn" :
							this.autoForward ( );
							break;
					}
					break;
				case "speed" :
					this.adjustSpeed ( target );
					break;
			}
		}
	}

	applyInfosCallback( infosDests ) {
		let numberFormat = new Intl.NumberFormat ( 'fr-FR' );

		let numberFormat2 = new Intl.NumberFormat ( 'fr-FR', { "minimumIntegerDigits" : 2 } );

		let numberFormat3 = new Intl.NumberFormat ( 'fr-FR', {
			"style" : "percent", "minimumFractionDigits" : 2, "maximumFractionDigits" : 2
		} );
		let myCallback = function ( infos ) {
			infosDests.fps.innerHTML = numberFormat2.format ( infos.dispRate );
			infosDests.bfs.innerHTML = infos.bufferSize;
			infosDests.pps.innerHTML = infos.opsRate;
			infosDests.ops.innerHTML = numberFormat.format ( infos.totalOps );
			infosDests.use.innerHTML = infos.usage === - 1 ? "xxxx" : numberFormat3.format ( ( infos.usage ).toFixed ( 2 ) );
		};
		this.#core.infosCallback = myCallback;
	}

	#createCanvas( dest ) {
		let self = this;
		this.canvas = document.createElement ( "canvas" );
		this.cvDest = dest || document.querySelector ( "#fourmi" ) || document.body;
		this.cvDest.appendChild ( this.canvas );
		this.cvDest.addEventListener ( "wheel", this.mouseWheel.bind ( self ) );
		this.#szObserve ( this.cvDest, this.applySize.bind ( self ) );
		this.#sz = this.cvDest.getBoundingClientRect ( );
		this.canvas.height = Math.floor ( this.#sz.height );
		this.canvas.width = Math.floor ( this.#sz.width );
	}

	autoForward( ) {
		this.#core.goForward ( );
	}
	autoBackward( ) {
		this.#core.goBackward ( );
	}
	stop( ) {
		this.#core.stopFourmi ( );
	}

	stepBackward( ) {
		this.#core.stepBackward ( );
	}
	stepForward( ) {
		this.#core.stepForward ( );
	}
	restart( ) {

	}
	pause( ) {

	}
	kill( ) {
		Fourmi.resizeObs.unobserve ( this.cvDest );
	}
	loadNewCycle( cycle, sucessCallback ) {
		this.#core.resetFourmi ( );
		this.setCycle ( cycle, sucessCallback );
	}

	setCycle( cycle, sucessCallback ) {
		let _rgb = new Array ( );
		let _dirs = new Array ( );
		cycle.rules.forEach ( function ( rule ) {
			//console.log ( { rule } );
			_rgb.push ( [
				rule.color.rgb.r,
				rule.color.rgb.g,
				rule.color.rgb.b,
				rule.color.rgb.a
			] );

			_dirs.push ( rule.dir );
		} );
		if ( this.#applyCycle ( {
			"colors" : _rgb, "directions" : _dirs
		} ) && sucessCallback )
			sucessCallback ( cycle );
	}


	adjustSpeed( target ) {
		if ( target.type && target.type === "radio" ) {
			let freq = target.dataset.frequency;
			let intv = target.dataset.interval;
			console.log ( freq, intv );
			if ( freq && intv ) {
				this.applySpeed ( freq, intv );
			}
		}
	}
	applySpeed( frequency, interval ) {
		let core = this.#core;
		let _nbOps = parseInt ( frequency );
		let _nbMilliSecs = parseInt ( interval );
		if ( _nbOps > 0 && _nbMilliSecs > 0 ) {
			if ( _nbOps !== core.frequency || _nbMilliSecs !== core.interval ) {

				if ( _nbOps !== core.frequency ) {
					core.frequency = _nbOps;
					//confirmAction ("newnbops", true);
					//console.log ( "newnbops", true );
				}

				if ( _nbMilliSecs !== core.interval ) {
					core.interval = _nbMilliSecs;
					//console.log ( "newspeed", true );
					//confirmAction ("newspeed", true);
				}

			} else {
//confirmAction ("clockparamsnoeffect", true);
			}
		} else {
//confirmAction ("error", true);
		}
	}
	/**
	 * Apply the cycle set
	 * @memberOf FourmiCore
	 * @param {Cycle} cycle
	 * @param {function} [sucessCallback]
	 * @returns {undefined}
	 * @throws Will throw an error if the argument is not well formed.
	 */
	#applyCycle( cycle ) {
		if ( ! ( cycle.colors && cycle.directions ) ) {
			throw new Error ( "Malformed cycle : should contains named objects 'colors' and 'directions'" );
		}
		let _rgb = cycle.colors;
		let _dirs = cycle.directions;
		if ( _rgb.length !== _dirs.length ) {
			throw new Error ( "Malformed properties : lengths not equal" );
		}
		if ( ! _rgb instanceof Array ) {
			throw new Error ( "Malformed property : colors property must be <Array>" );
		}
		if ( ! _dirs instanceof Array ) {
			throw new Error ( "Malformed property : directions property must be <Array>" );
		}
		_dirs.forEach ( dir => {
			if ( ! ( dir === - 1 || dir === 1 ) ) {
				throw new Error ( "Malformed property direction : only -1 or 1 can be used as values" );
			}
		} );
		/*_rgb.forEach ( rgb => {
		 let k = Object.keys ( rgb );
		 if ( ! ( k.includes ( "r" ) && k.includes ( "g" ) && k.includes ( "b" ) ) ) {
		 throw new Error ( "Malformed property colors : should contains named objects 'r', 'g', 'b'" );
		 }*/
		_rgb.forEach ( function ( myRgb ) {
			if ( myRgb.length !== 4 ) {
				throw new Error ( "Malformed property colors : should contains 4 numbers (red, green, blue, alpha)" );
			}
			if ( myRgb < 0 || myRgb > 255 ) {
				throw new Error ( "Malformed property color : possible values for a color are 0 to 255 " );
			}
		} );
		//} );
		this.#core.dirs = _dirs;
		this.#core.colors = _rgb;
		return true;
	}

	applyEvents( graphArea ) {
		graphArea.addEventListener ( "pointerup", this.pointerup.bind ( this ) );
		graphArea.addEventListener ( "pointermove", this.pointermove.bind ( this ) );
		graphArea.addEventListener ( "pointerleave", this.pointerup.bind ( this ) );
		graphArea.addEventListener ( "pointercancel", this.pointerup.bind ( this ) );
		graphArea.addEventListener ( "pointerout", this.pointerup.bind ( this ) );
		graphArea.addEventListener ( "pointerdown", this.pointerdown.bind ( this ) );
	}

	/*
	 * ============================== SIZE ==============================
	 */

	applySize( obj ) {
		this.#sz = this.cvDest.getBoundingClientRect ( );
		this.#core.doResize ( { "width" : this.#sz.width, "height" : this.#sz.height } );
	}


	/*
	 * ============================== MOVE ==============================
	 */

	#pointers = new Array ( );
	#lastMoveCds = [ null, null ];
	pointermove = function ( e ) {
		if ( this.#pointers.length !== 1 )
			return;
		this.#applyMove ( e );
	}

	pointerdown = function ( e ) {
		//console.log ( "miaou", e.bubbles );
		if ( e.target !== this.canvas ) return;
		if ( this.#pointers.length )
			return;
		this.#pointers.push ( e.pointerId );
		this.#lastMoveCds = [ e.screenX, e.screenY ];
	}

	pointerup = function ( e ) {
		if ( this.#pointers.includes ( e.pointerId ) ) {
			this.#lastMoveCds = [ null, null ];
		}
		this.#pointers.splice ( this.#pointers.indexOf ( e.pointerId ), 1 );
	}

	#applyMove( e ) {
		let delta = {
			"dx" : e.screenX - this.#lastMoveCds[0], "dy" : e.screenY - this.#lastMoveCds[1]
		};
		this.#lastMoveCds[0] = e.screenX;
		this.#lastMoveCds[1] = e.screenY;
		this.#core.doMove ( delta );
	}

	/*
	 * ============================== ZOOM ==============================
	 */
	#setZoom( zoomFactor )
	{
		if ( this.#core.isBusy ) return;
		this.#core.isBusy = true;
		this.#core.clearCanvas ( );
		this.#zoomLevel = zoomFactor;
		this.#core.antSize = this.#calcAntSize ( zoomFactor );
		if ( this.#zoomLevel === 0 ) {
			this.#core.renderElement = this.#core.renderElementPix;
		} else {
			this.#core.renderElement = this.#core.renderElementClassic;
		}
		this.#core.redessinerTout ( );
		this.#core.isBusy = false;
	}

	#calcAntSize( p )
	{
		return Math.pow ( 10, Math.floor ( p / Fourmi.muls.length ) ) * Fourmi.muls[p % Fourmi.muls.length];
	}
	mouseWheel( e )
	{
//console.log ( "zooooom" );
		if ( ! e.deltaY || e.ctrlKey )
			return;
		//let lastAntSz = this.#core.antSz;
		switch ( Math.abs ( e.deltaY ) / e.deltaY ) {
			case 1 :
				if ( this.#calcAntSize ( this.#zoomLevel ) < ( this.#sz.width / 5 ) )
					this.#setZoom ( this.#zoomLevel + 1 );
				break;
			case - 1 :
				if ( this.#zoomLevel > 0 )
					this.#setZoom ( this.#zoomLevel - 1 );
				break;
		}
	}
}


