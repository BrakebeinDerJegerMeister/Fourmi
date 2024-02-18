let colorPicker_ = { };
( function ( ) {

	//==========================================================================================
	let colorFactoryParams = {
		"baseHeight" : 1000,
		"baseWidth" : 1000,
		"nbCircles" : 48, // Nombre de cercles
		"circleRadius" : 30, // Rayon d'un cercle
		"outlineDelta" : 6, // Outline distance
		"circlesDelta" : 40, // Ecart du 2ème cercle
		"globalMargin" : 10, // Marge glabale intÃ©rieure
		"nbTriangles" : 8, // Nombre de triangles par cotÃ©
		"trianglesDelta" : 2, // Ecart entre les trianles
		"baseCorrection" : 5, // Correction de la base du triangle principal [ 3...10 ]
		"triangleRadiusDelta" : 25, // Delta du rayon du cercle circonscrit du grand triangle
		"triangleMargin" : 10 // Marge extÃ©rieure du grand triangle
	};
	//==========================================================================================


	function ColorPickerSystem( destinationNode ) {

		let template = document.querySelector ( "#colorPickerTemplate" );
		let imported = document.importNode ( template.content, true );
		const mainElementNode = imported.querySelector ( "#colorPickerSystem" );

		//==========================================================================================
		let lastSelectedCircle = null;
		let lastSelectedTriangle = null;
		let lastSelectedColor = null;
		let refColor = null;
		let isEnabled = true;
		//==========================================================================================
		const colorPickerNode = mainElementNode.querySelector ( "#colorPicker" );
		const svgCanvasNode = mainElementNode.querySelector ( "#svgCanvas" );
		const circlesGroupNode = mainElementNode.querySelector ( "#circlesGroup" );
		const trianglesGroupNode = mainElementNode.querySelector ( "#trianglesGroup" );
		const colorPreviewNode = mainElementNode.querySelector ( "#selectedColor" );
		const circleSelectorNode = mainElementNode.querySelector ( "#circleSelector" );
		const colorAcceptNode = mainElementNode.querySelector ( "#colorAccept" );
		const colorDontNode = mainElementNode.querySelector ( "#colorDont" );
		//==========================================================================================
		const colorFactory = new ColorFactory ( svgCanvasNode, colorFactoryParams, circlesGroupNode, trianglesGroupNode );
		//==========================================================================================
		this.onSelectTriangleCallback = function () {};
		this.onSelectCircleCallback = function () {};
		this.onAcceptCallback = function () {};
		this.onRejectCallback = function () {};
		//==========================================================================================

		if ( destinationNode ) {
			destinationNode.appendChild ( mainElementNode );
		}


		this.open = function ( rule ) {
			enableEvents ();
			if ( rule ) this.selectHSBItems ( rule );
			//colorPicker.hidden = false;
		};
		this.close = function () {
			//colorPicker.hidden = true;
			disableEvents ();
		};

		Object.defineProperty ( this, "enabled", {
			get() {
				return isEnabled;
			},
			set( b ) {
				if ( b && ! isEnabled ) {
					isEnabled = true;
					mainElementNode.classList.remove ( "disabled" );
				} else if ( ! b && isEnabled ) {
					isEnabled = false;
					mainElementNode.classList.add ( "disabled" );
				}
			}
		} );

		this.enabled = false;

		this.unselectHSBItems = function () {
			removeTriangleOverlay ( );
			removeCircleOverlay ( );
		};

		this.selectHSBItems = function ( color ) {
			refColor = color;
			let circle = colorFactory.circles[ color.pick.hL ];
			let triangle = colorFactory.triangles[ color.pick.cL ][ color.pick.bL ];
			setAcceptState ( false );
			selectCircle ( circle );
			selectTriangle ( triangle );
			return { "circle" : circle.SVGcircle, "triangle" : triangle.SVGtriangle, "pickedColor" : color.clone () };
		};

		function selectCircle( circle ) {
			colorFactory.distributeColors ( circle.color.pick.hL );
			doCircleOverlay ( circle );
			lastSelectedCircle = circle;
			if ( lastSelectedTriangle ) selectTriangle ( lastSelectedTriangle );

			let SVGcircle = circle.svg;
			circleSelectorNode.setAttributeNS ( null, "cx", SVGcircle.getAttributeNS ( null, "cx" ) );
			circleSelectorNode.setAttributeNS ( null, "cy", SVGcircle.getAttributeNS ( null, "cy" ) );
			circleSelectorNode.setAttributeNS ( null, "r", parseFloat ( SVGcircle.getAttributeNS ( null, "r" ) ) + 6 );
			circleSelectorNode.setAttributeNS ( null, "fill", "none" );
			circleSelectorNode.setAttributeNS ( null, "stroke", "white" );
			circleSelectorNode.setAttributeNS ( null, "stroke-width", 3 );

			return SVGcircle;
		}

		function selectTriangle( triangle ) {
			doTriangleOverlay ( triangle );
			lastSelectedTriangle = triangle;
			lastSelectedColor = triangle.color;
			doPreviewColor ( triangle.color );
			return triangle.svg;
		}

		function doTriangleOverlay( triangle ) {
			if ( lastSelectedTriangle && lastSelectedTriangle !== triangle ) {
				removeTriangleOverlay ( );
				triangle.svg.classList.add ( "selected" );
			}
		}
		function doCircleOverlay( circle ) {
			if ( lastSelectedCircle && lastSelectedCircle !== circle ) {
				removeCircleOverlay ( );
				circle.svg.classList.remove ( "selected" );
			}
		}
		function removeTriangleOverlay( ) {
			if ( ! lastSelectedTriangle ) return;
			lastSelectedTriangle.svg.classList.remove ( "selected" );
		}
		function removeCircleOverlay( ) {
			if ( ! lastSelectedCircle ) return;
			lastSelectedCircle.svg.classList.remove ( "selected" );
		}

		function setAcceptState( triangle ) {
			if ( ! triangle ) {
				acceptColorState.enabled = false;
				return;
			}
			if ( triangle.color && isRefColor ( triangle.color ) ) {
				acceptColorState.enabled = false;
			} else {
				acceptColorState.enabled = true;
			}
		}

		function isRefColor( color ) {
			let r = refColor.pick;
			let c = color.pick;
			return r && c && r.hL == c.hL && r.cL == c.cL && r.bL == c.bL && r.nbT == c.nbT && r.nbC == c.nbC;
		}

		function doAcceptColor( color ) {
			refColor = color;
			acceptColorState.enabled = false;
		}

		function doPreviewColor( color ) {
			colorPreviewNode.style.backgroundColor = color.rgb.toString ();
		}

		let acceptColorState = {
			get enabled() {
				return ! colorAcceptNode.classList.contains ( "disabled" );
			},
			set enabled( b ) {
				if ( ! b ) colorAcceptNode.classList.add ( "disabled" );
				else colorAcceptNode.classList.remove ( "disabled" );
			}
		};




		const pointers = new Array ( );
		let lockedBy = null;

		function applyMove( e ) {
			//console.log(lockedBy);
			if ( lockedBy === circlesGroupNode ) {
				let circle = colorFactory.getCircle ( e );
				selectCircle ( circle );
				setAcceptState ( lastSelectedTriangle );
				if ( this.onSelectCircleCallback instanceof Function ) {
					this.onSelectCircleCallback ( circle.color );
				}
			}
			if ( lockedBy === trianglesGroupNode ) {
				let triangle = colorFactory.getTriangle ( e );
				selectTriangle ( triangle );
				setAcceptState ( triangle );
				if ( this.onSelectTriangleCallback instanceof Function ) {
					this.onSelectTriangleCallback ( triangle.color );
				}
			}
		}


		const groupPointerdown = function ( e ) {
			e.stopPropagation ( );
			if ( pointers.length || lockedBy ) return;
			if ( ! lockedBy ) lockedBy = this;
			pointers.push ( e.pointerId );
			applyMove ( e );
		};

		const svgCanvasPointerdown = ( e ) => {
			e.stopPropagation ( );
			doOtherEvents ( e );
		};
		const svgCanvasPointerup = ( e ) => {
			if ( e.target === svgCanvasNode ) e.stopPropagation ( );
			if ( ! lockedBy ) return;
			if ( pointers.includes ( e.pointerId ) ) {
				lockedBy = null;
			}
			pointers.splice ( pointers.indexOf ( e.pointerId ), 1 );
		};
		const svgCanvasPointermove = ( e ) => {
			if ( e.target === svgCanvasNode ) e.stopPropagation ( );
			if ( pointers.length !== 1 )
				return;
			applyMove ( e );
		};
		const svgCanvasPointerleave = ( e ) => {
			if ( e.target === svgCanvasNode ) e.stopPropagation ( );
			if ( ! lockedBy ) return;
			if ( pointers.includes ( e.pointerId ) ) {
				lockedBy = null;
			}
			pointers.splice ( pointers.indexOf ( e.pointerId ), 1 );
		};



		let doOtherEvents = ( e ) => {
			let target = e.target;
			if ( target.id ) {
				switch ( target.id ) {
					case "colorAccept":
						if ( this.onAcceptCallback && acceptColorState.enabled ) {
							doAcceptColor ( lastSelectedColor );
							this.onAcceptCallback ( lastSelectedColor );
						}
						break;
					case "colorDont":
						if ( this.onRejectCallback ) this.onRejectCallback ();
						break;
				}
			}
		};

		let eventsEnabled = false;
		function enableEvents() {
			if ( eventsEnabled ) return;
			eventsEnabled = true;
			circlesGroupNode.addEventListener ( "pointerdown", groupPointerdown );
			trianglesGroupNode.addEventListener ( "pointerdown", groupPointerdown );
			mainElementNode.addEventListener ( "pointerdown", svgCanvasPointerdown );
			mainElementNode.addEventListener ( "pointerup", svgCanvasPointerup );
			mainElementNode.addEventListener ( "pointermove", svgCanvasPointermove );
			mainElementNode.addEventListener ( "pointerleave", svgCanvasPointerleave );
		}

		function disableEvents() {
			if ( ! eventsEnabled ) return;
			eventsEnabled = false;
			circlesGroupNode.removeEventListener ( "pointerdown", groupPointerdown );
			trianglesGroupNode.removeEventListener ( "pointerdown", groupPointerdown );
			mainElementNode.removeEventListener ( "pointerdown", svgCanvasPointerdown );
			mainElementNode.removeEventListener ( "pointerup", svgCanvasPointerup );
			mainElementNode.removeEventListener ( "pointermove", svgCanvasPointermove );
			mainElementNode.removeEventListener ( "pointerleave", svgCanvasPointerleave );
		}

		this.kill = function () {
			this.disableEvents ();
		};
	}


	function ColorFactory( myCanvasNode, params, myCircleGroupNode, myTriangleGroupNode ) {
		let myCircles = [ ];
		let myTriangles = [ ];
		let myCurrentAngle = 0;

		let svgNS = myCanvasNode.namespaceURI;
		let height = params.baseHeight;
		let width = height;
		let dx = width / 2;
		let dy = height / 2;
		let f = params.nbCircles;
		let r = params.circleRadius;
		let d = params.circlesDelta;
		let m = params.globalMargin;
		let nb = params.nbTriangles;
		let e = params.trianglesDelta;
		let gamma = Math.PI / params.baseCorrection;
		let rt = dx - 2 * r - d - m - params.triangleRadiusDelta - params.triangleMargin;

		let ec = params.triangleMargin;
		let beta = Math.atan ( Math.cos ( gamma ) / ( 1 + Math.sin ( gamma ) ) );
		//let alpha = Math.PI / 2 - beta;
		let ex = e * ( 1 + Math.sin ( beta ) ) / Math.cos ( beta );
		let ey = e;
		let eh = e / Math.sin ( beta );
		let B = { "x" : 0, "y" : - rt };
		let D = { "x" : rt * Math.cos ( gamma ), "y" : rt * Math.sin ( gamma ) };
		let G = { "x" : - D.x, "y" : D.y };
		let bbL = ( D.x - G.x ) / nb;
		let bbH = ( D.y - B.y ) / nb;

		myCanvasNode.setAttributeNS ( null, "height", params.baseHeight );
		myCanvasNode.setAttributeNS ( null, "width", params.baseWidth );
		myCanvasNode.setAttributeNS ( null, "viewBox", [ 0, 0, params.baseWidth, params.baseHeight ] );
		myCircleGroupNode.setAttributeNS ( null, "transform", `translate(${ dx }, ${ dy })` );

		function Circle( i ) {
			let angle = i * 360 / f;
			let color = colorManager_.createColor ( { "h" : angle, "s" : 100, "l" : 50, "a" : 1 } );
			let circle = document.createElementNS ( svgNS, "circle" );
			circle.classList.add ( "colorPickerCircle" );
			circle.setAttributeNS ( null, "r", r );
			circle.setAttributeNS ( null, "fill", color.hsl.toString () );
			circle.setAttributeNS ( null, "cx", ( dx - r - m - ( i % 2 ) * d ) * Math.cos ( Math.PI * 2 * i / f ) );
			circle.setAttributeNS ( null, "cy", ( dy - r - m - ( i % 2 ) * d ) * Math.sin ( Math.PI * 2 * i / f ) );
			myCircleGroupNode.appendChild ( circle );
			this.svg = circle;
			this.color = color;
			this.angle = angle;
		}

		function createCircles() {
			for ( let i = 0; i < f; i ++ ) {
				let circle = new Circle ( i );
				myCircles.push ( circle );
			}
			myCircles.push ( myCircles[0] );
			return myCircles;
		}

		function createTriangles() {
			/* Considérant le triangle avec une  base horizontale
			 *
			 *	Brightness ->
			 *
			 *      ▲          chroma 1 (ex : chromaLevel 5)
			 *     ▲▼▲
			 *    ▲▼▲▼▲
			 *   ▲▼▲▼▲▼▲
			 *  ▲▼▲▼▲▼▲▼▲
			 * ▲▼▲▼▲▼▲▼▲▼▲     chroma 0 (ex : chromaLevel 0)
			 *
			 */
			myTriangles = new Array ( nb );
			for ( let vt = 0; vt < nb; vt ++ ) { // Parcours vertical (chroma) haut vers le bas
				let maxNbTri = 2 * vt + 1;
				myTriangles[nb - vt - 1] = new Array ( maxNbTri );
				for ( let hz = 0; hz < maxNbTri; hz ++ ) { // Parcours horizontal (brightness)
					let triangle = new Triangle ( hz, vt );
					myTriangles[nb - vt - 1][hz] = triangle;
				}
			}
			return myTriangles;
		}

		function createSuperTriangle( ) {
			let superTri = document.createElementNS ( svgNS, "path" );
			let _ex = ec * ( 1 + Math.sin ( beta ) ) / Math.cos ( beta );
			let _ey = ec;
			let _eh = ec / Math.sin ( beta );
			superTri.setAttributeNS ( null, "d", `M${ B.x } ${ B.y - _eh } ${ D.x + _ex } ${ D.y + _ey }L ${ G.x - _ex } ${ G.y + _ey }Z` );
			superTri.setAttributeNS ( null, "stroke", "white" );
			superTri.setAttributeNS ( null, "stroke-width", 5 );
			superTri.setAttributeNS ( null, "stroke-linejoin", "miter" );
			myTriangleGroupNode.appendChild ( superTri );
			return superTri;
		}

		myTriangleGroupNode.setAttributeNS ( null, "transform", `translate(${ dx }, ${ dy })` );
		function Triangle( hz, vt ) {
			let nbHz = 2 * vt + 1;
			let chroma = ( nb - vt - 1 ) / ( nb - 1 );
			let brightness = 50 + ( ( hz - ( nbHz - 1 ) / 2 ) / ( nb - 1 ) ) * 50;
			let saturation = ( ( chroma / ( 1 - Math.abs ( 2 * brightness / 100 - 1 ) ) ) || 0 ) * 100;

			let chromaLevel = nb - vt - 1;
			let brightnessLevel = hz;

			let pos = { "x" : B.x + ( hz - vt ) * bbL / 2, "y" : B.y };
			let sw = ( 2 * ( hz % 2 ) - 1 );
			let _b = { // Bas
				"x" : pos.x,
				"y" : pos.y + bbH * vt + bbH * ( hz % 2 ) - sw * eh
			};
			let _d = { // Droite
				"x" : pos.x + bbL / 2 - ex,
				"y" : pos.y + bbH * ( vt + 1 ) - ( bbH * ( hz % 2 ) ) + sw * ey
			};
			let _g = { // Gauche
				"x" : pos.x - bbL / 2 + ex,
				"y" : _d.y
			};
			let tri = document.createElementNS ( svgNS, "path" );
			tri.classList.add ( "colorPickerTri" );
			tri.setAttributeNS ( null, "d", `M${_b.x} ${_b.y} ${_d.x} ${_d.y}L ${_g.x} ${_g.y}Z` );
			tri.dataset.pickBl = brightnessLevel;
			tri.dataset.pickCl = chromaLevel;

			myTriangleGroupNode.appendChild ( tri );

			let pick = { "hL" : 0, "cL" : chromaLevel, "bL" : brightnessLevel, "a" : 1, "nbT" : nb, "nbC" : f };
			this.color = colorManager_.createColor ( pick );
			this.chroma = chroma;
			this.svg = tri;

		}

		function distributeColors( hueLevel ) {
			let hue = hueLevel * 360 / f;
			rotateTriangle ( hue );
			myCurrentAngle = hue;
			superTri.setAttributeNS ( null, "stroke", `hsl(${ hue }, 100%, 50%)` );
			myTriangles.forEach ( function ( triangles ) {
				triangles.forEach ( function ( triangle ) {
					let color = colorManager_.createColor ( { ...triangle.color.hsl.obj, "h" : hue } );
					triangle.color = color;
					triangle.svg.setAttributeNS ( null, "fill", color.hsl.toString () );
				} );
			} );
		}

		function rotateTriangle( angle ) {
			myTriangleGroupNode.setAttributeNS ( null, "transform", `rotate(${ ( parseFloat ( angle ) + 90 ) % 360 }, ${ dx }, ${ dy }) translate(${ dx }, ${ dy }) ` );
		}

		function getTriangle( e ) {
			let c = svgCanvas.getBoundingClientRect ( );
			let cc = colorPicker.getBoundingClientRect ( );
			let ratioH = 1000 / c.width;
			let ratioV = 1000 / c.height;

			let click = { "x" : e.pageX - cc.x, "y" : e.pageY - cc.y };
			let centre = { "x" : c.width / 2, "y" : c.height / 2 };

			let lg = Math.sqrt ( Math.pow ( click.x - centre.x, 2 ) + Math.pow ( click.y - centre.y, 2 ) );

			let v = click.y > centre.y;

			let angleCliqué = ( v ? 0 : Math.PI * 2 ) + Math.acos ( ( click.x - centre.x ) / lg ) * ( v ? 1 : - 1 );

			// Appliquer l'angle en cours et la rotation forcée a 90° à l'origine
			let angleCliquéH = ( angleCliqué * 180 / Math.PI - myCurrentAngle - 90 ) % 360;

			let x = ( lg * Math.cos ( Math.PI * angleCliquéH / 180 ) + centre.x ) * ratioH;
			let y = ( lg * Math.sin ( Math.PI * angleCliquéH / 180 ) + centre.y ) * ratioV;

			// y détermine chromaLevel
			// x détermine brightnessLevel

			let _ch = ( y - ( B.y + centre.y * ratioV ) ) / bbH;
			let _chro = Math.ceil ( _ch );
			let chromaLevel = nb - _chro;
			if ( chromaLevel < 0 ) chromaLevel = 0;
			if ( chromaLevel >= nb ) chromaLevel = nb - 1;


			let largeLocalBaseY = ( _chro ) * bbH + ( B.y + centre.y * ratioV );

			let _lu = 2 * ( x - ( G.x + centre.x * ratioH ) ) / bbL - chromaLevel;
			let _lum = Math.floor ( _lu );
			// Ratio d'avancement horizontal dans une base de demi triangle N [0->1][0->1]
			let hNiv = ( _lu % 1 ) * bbH / bbL;

			// ▲ triangle N
			// ▼ triangle R

			let level = null;
			let inter = null;
			let brightnessLevel = _lum - 1;
			// Dans un triangle N
			if ( _lum % 2 ) {
				// partie gauche
				inter = largeLocalBaseY - ( 1 - hNiv ) * bbH;
				level = y > ( inter );
				if ( ! level ) {
					brightnessLevel ++;
				}
			} else {
				// partie droite
				inter = largeLocalBaseY - hNiv * bbH;
				level = y > ( inter );
				if ( level ) brightnessLevel ++;
			}

			let nbTri = ( nb - chromaLevel ) * 2 - 1;
			if ( brightnessLevel < 0 ) brightnessLevel = 0;
			if ( brightnessLevel >= nbTri ) brightnessLevel = nbTri - 1;
			return myTriangles[ chromaLevel ][ brightnessLevel ];
		}

		function getCircle( e ) {
			let c = svgCanvas.getBoundingClientRect ( );
			let click = { "x" : e.pageX, "y" : e.pageY };
			let centre = { "x" : c.x + c.width / 2, "y" : c.y + c.height / 2 };
			let lg = Math.sqrt ( Math.pow ( click.x - centre.x, 2 ) + Math.pow ( click.y - centre.y, 2 ) );
			let v = click.y > centre.y;
			let angle = ( v ? 0 : Math.PI * 2 ) + Math.acos ( ( click.x - centre.x ) / lg ) * ( v ? 1 : - 1 );
			return myCircles[Math.round ( f * angle / ( Math.PI * 2 ) )];
		}

		const circles = createCircles ();
		const superTri = createSuperTriangle ();
		const triangles = createTriangles ();

		distributeColors ( 0 );

		return {
			"superTri" : superTri,
			"circles" : circles,
			"triangles" : triangles,
			"getCircle" : getCircle,
			"getTriangle" : getTriangle,
			"distributeColors" : distributeColors
		};
	}


	colorPicker_ = {
		"ColorPickerSystem" : ColorPickerSystem
	};



} ) ( );
