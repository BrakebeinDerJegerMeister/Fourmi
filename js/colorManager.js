let colorManager_ = { };

( function () {
	function _RGBtoHSL( rgb ) {
		//console.log ( rgb );
		let R = parseInt ( rgb.r ) / 255;
		let G = parseInt ( rgb.g ) / 255;
		let B = parseInt ( rgb.b ) / 255;
		let M = Math.max ( R, G, B );
		let m = Math.min ( R, G, B );
		let C = M - m;

		let _T = null;
		if ( C !== 0 ) {
			if ( M === R ) _T = ( 6 + ( G - B ) / C ) % 6;
			else if ( M === G ) _T = ( 6 + 2 + ( B - R ) / C ) % 6;
			else if ( M === B ) _T = ( 6 + 4 + ( R - G ) / C ) % 6;
		}
		let T = 60 * _T;
		let L = ( M + m ) / 2;
		let S = L === 1 ? 0 : L === 0 ? 0 : C / ( 1 - Math.abs ( 2 * L - 1 ) );
		// Bricolage S = 0 si L = 0
		let A = isNaN ( rgb.a ) ? 1 : rgb.a / 255;
		return { "h" : T, "s" : S * 100, "l" : L * 100, "a" : A };
	}


	function _HSLtoRGB( hsl ) {
		let H = ( hsl.h * 1 ) % 360;
		let S = hsl.s / 100;
		let L = hsl.l / 100;
		let C = ( 1 - Math.abs ( 2 * L - 1 ) ) * S;
		let m = ( L - C / 2 );
		let T = H / 60;
		let X = C * ( 1 - Math.abs ( T % 2 - 1 ) );
		let [ r, g, b ] = [ null, null, null ];
		if ( isNaN ( H ) ) {
			[ r, g, b ] = [ 0, 0, 0 ];
		} else {
			if ( T >= 0 && T < 1 ) [ r, g, b ] = [ C, X, 0 ];
			else if ( T >= 1 && T < 2 ) [ r, g, b ] = [ X, C, 0 ];
			else if ( T >= 2 && T < 3 ) [ r, g, b ] = [ 0, C, X ];
			else if ( T >= 3 && T < 4 ) [ r, g, b ] = [ 0, X, C ];
			else if ( T >= 4 && T < 5 ) [ r, g, b ] = [ X, 0, C ];
			else if ( T >= 5 && T < 6 ) [ r, g, b ] = [ C, 0, X ];
		}
		let R = Math.round ( ( r + m ) * 255 );
		let G = Math.round ( ( g + m ) * 255 );
		let B = Math.round ( ( b + m ) * 255 );
		let A = Math.round ( Math.max ( 0, Math.min ( ( isNaN ( hsl.a ) ? 1 : hsl.a ) * 255, 255 ) ) );
		return { "r" : R, "g" : G, "b" : B, "a" : A };
	}

	function _HSLtoPICK( hsl, nbTri, nbCir ) {
		let H = hsl.h;
		let S = hsl.s;
		let L = hsl.l;
		let A = hsl.a;
		let C = ( 1 - Math.abs ( 2 * L / 100 - 1 ) ) * S / 100;

		let chromaLevel = Math.round ( C * ( nbTri - 1 ) );
		// Longueur maxi possible d'une ligne
		let maxHz = 2 * nbTri - 1;
		/* chromaLevel : Numéro de la ligne en comptant depuis la base vers le sommet
		 * brightnessLevel : Faire correspondre une ligne quelconque à la plus grande
		 * exemple pour nbTri = 5 (en principe 8...)
		 *
		 *      ▲       chromaLevel = 5 ; BrightnessLevels (1) -> =            0,            réel :           F
		 *     ▲▼▲      chromaLevel = 4 ; BrightnessLevels (3) -> =          0,1,2           réel :         E,F,G
		 *    ▲▼▲▼▲     chromaLevel = 3 ; BrightnessLevels (5) -> =        0,1,2,3,4         réel :       D,E,F,G,H
		 *   ▲▼▲▼▲▼▲    chromaLevel = 2 ; BrightnessLevels (7) -> =      0,1,2,3,4,5,6       réel :     C,D,E,F,G,H,I
		 *  ▲▼▲▼▲▼▲▼▲   chromaLevel = 1 ; BrightnessLevels (9) -> =    0,1,2,3,4,5,6,7,8     réel :   B,C,D,E,F,G,H,I,J
		 * ▲▼▲▼▲▼▲▼▲▼▲  chromaLevel = 0 ; BrightnessLevels (11) -> = 0,1,2,3,4,5,6,7,8,9,10  réel : A,B,C,D,E,F,G,H,I,J,K
		 *
		 * Une ligne est décalée de 'chromaLevel' vers la droite par rapport à la base
		 * car les luminances sont également centrées par colonnes en partant de la base :
		 * Une colonne = Même luminance
		 * Une ligne = Même chroma
		 */
		let brightnessLevel = Math.round ( ( maxHz - 1 ) * ( L / 100 ) ) - chromaLevel;
		/* hueLevel : Numéro du cercle
		 * 0 : centré autour de 0°
		 * Exemple pour 8 cercles :
		 *
		 *        ○
		 *   ○         ○ <- cercle n° 7
		 *
		 * ○             ○ <- cercle n° 0
		 *
		 *   ○         ○ <- cercle n° 1
		 *        ○
		 */
		let hueLevel = Math.round ( nbCir * H / 360 );

		return {
			"hL" : hueLevel,
			"cL" : chromaLevel,
			"bL" : brightnessLevel,
			"nbT" : nbTri,
			"nbC" : nbCir,
			"a" : A
		};
	}

	function _PICKtoHSL( pick ) {
		let nbT = pick.nbT;
		let nbC = pick.nbC;
		let H = pick.hL / nbC;
		let C = pick.cL / ( nbT - 1 );
		let L = ( pick.bL + pick.cL ) / ( 2 * nbT - 2 );
		let A = pick.a;
		let S = L === 1 ? 0 : L === 0 ? 0 : C / ( 1 - Math.abs ( 2 * L - 1 ) );
		return {
			"h" : H * 360,
			"s" : S * 100,
			"l" : L * 100,
			"a" : A
		};
	}

	class _RGB {
		#_r = null;
		#_g = null;
		#_b = null;
		#_a = null;
		constructor( rgbColor ) {
			if ( rgbColor instanceof Array ) {
				this.#_r = rgbColor[0];
				this.#_g = rgbColor[1];
				this.#_b = rgbColor[2];
				this.#_a = rgbColor[3];
			} else {
				this.#_r = rgbColor.r;
				this.#_g = rgbColor.g;
				this.#_b = rgbColor.b;
				this.#_a = rgbColor.a;
			}
		}
		get r() {
			return this.#_r;
		}
		get g() {
			return this.#_g;
		}
		get b() {
			return this.#_b;
		}
		get a() {
			return this.#_a;
		}
		toHSL() {
			return _RGBtoHSL ( this );
		}
		toPICK() {
			return _HSLtoPICK ( this.toHSL () );
		}
		clone() {
			return new _RGB ( this );
		}
		equals( e ) {
			return ( e instanceof _RGB ) &&
					this.#_r == e.r &&
					this.#_g == e.g &&
					this.#_b == e.b &&
					this.#_a == e.a;
		}
		get obj() {
			return { "r" : this.#_r, "g" : this.#_g, "b" : this.#_b, "a" : this.#_a };
		}
		toString() {
			return `rgb${ this.#_a ? "a" : "" }(${this.#_r}, ${this.#_g}, ${this.#_b}${this.#_a ? ", " + this.#_a : ""})`;
		}
	}

	class _HSL {
		#_h = null;
		#_s = null;
		#_l = null;
		#_a = null;
		constructor( hslColor ) {
			if ( hslColor instanceof Array ) {
				this.#_h = hslColor[0];
				this.#_s = hslColor[1];
				this.#_l = hslColor[2];
				this.#_a = hslColor[3];
			} else {
				this.#_h = hslColor.h;
				this.#_s = hslColor.s;
				this.#_l = hslColor.l;
				this.#_a = hslColor.a;
			}
		}
		get h() {
			return this.#_h;
		}
		get s() {
			return this.#_s;
		}
		get l() {
			return this.#_l;
		}
		get a() {
			return this.#_a;
		}
		toRGB() {
			return _HSLtoRGB ( this );
		}
		toPICK() {
			return _HSLtoPICK ( this );
		}
		clone() {
			return new _HSL ( this );
		}
		equals( e ) {
			return ( e instanceof _HSL ) &&
					this.#_h == e.h &&
					this.#_s == e.s &&
					this.#_l == e.l &&
					this.#_a == e.a;
		}
		get obj() {
			return { "h" : this.#_h, "s" : this.#_s, "l" : this.#_l, "a" : this.#_a };
		}
		toString() {
			return `hsl${ this.#_a ? "a" : "" }(${this.#_h}, ${this.#_s}%, ${this.#_l}%${this.#_a ? ", " + this.#_a : ""})`;
		}
	}

	class _PICK {
		#_hL = null;
		#_cL = null;
		#_bL = null;
		#_nbT = null;
		#_nbC = null;
		#_a = null;
		constructor( pickColor ) {
			if ( pickColor instanceof Array ) {
				this.#_hL = pickColor[0];
				this.#_cL = pickColor[1];
				this.#_bL = pickColor[2];
				this.#_a = pickColor[3];
				this.#_nbT = pickColor[4];
				this.#_nbC = pickColor[5];
			} else {
				this.#_hL = pickColor.hL;
				this.#_cL = pickColor.cL;
				this.#_bL = pickColor.bL;
				this.#_a = pickColor.a;
				this.#_nbT = pickColor.nbT;
				this.#_nbC = pickColor.nbC;
			}
		}
		get hL() {
			return this.#_hL;
		}
		get cL() {
			return this.#_cL;
		}
		get bL() {
			return this.#_bL;
		}
		get nbT() {
			return this.#_nbT;
		}
		get nbC() {
			return this.#_nbC;
		}
		get a() {
			return this.#_a;
		}
		toRGB() {
			return _HSLtoRGB ( _PICKtoHSL () );
		}
		toHSL() {
			return _PICKtoHSL ( this );
		}
		clone() {
			return new _PICK ( this );
		}
		equals( e ) {
			return ( e instanceof _PICK ) &&
					this.#_hL == e.hL &&
					this.#_cL == e.cL &&
					this.#_bL == e.bL &&
					this.#_nbT == e.nbT &&
					this.#_nbC == e.nbC &&
					this.#_a == e.a;
		}
		get obj() {
			return {
				"hL" : this.#_hL,
				"cL" : this.#_cL,
				"bL" : this.#_bL,
				"a" : this.#_a,
				"nbT" : this.#_nbT,
				"nbC" : this.#_nbC
			};
		}
		toString() {
			return `hL : ${ this.#_hL }, cL : ${this.#_cL}, bL : ${this.#_bL}, nbT : ${this.#_nbT}, nbC : ${this.#_nbC} ${this.#_a ? ", a : " + this.#_a : ""}`;
		}
		toJSONstr() {
			return `{ "pick" : [ ${ this.#_hL }, ${this.#_cL}, ${this.#_bL}, ${this.#_a}, ${this.#_nbT}, ${this.#_nbC} ] } `;
		}
		toJSON() {
			return {
				"pick" : [ this.#_hL, this.#_cL, this.#_bL, this.#_a, this.#_nbT, this.#_nbC ]
			};
		}
	}


	class Color {

		#_rgb = null;
		#_hsl = null;
		#_pick = null;

		#_createHSL( hslColor ) {
			this.#_hsl = hslColor;
			this.#_rgb = new _RGB ( _HSLtoRGB ( this.#_hsl ) );
			this.#_pick = new _PICK ( _HSLtoPICK ( this.#_hsl, 8, 48 ) );
		}
		#_createRGB( rgbColor ) {
			this.#_rgb = rgbColor;
			this.#_hsl = new _HSL ( _RGBtoHSL ( this.#_rgb ) );
			this.#_pick = new _PICK ( _HSLtoPICK ( this.#_hsl, 8, 48 ) );
		}
		#_createPICK( pickColor ) {
			this.#_pick = pickColor;
			this.#_hsl = new _HSL ( _PICKtoHSL ( this.#_pick ) );
			this.#_rgb = new _RGB ( _HSLtoRGB ( this.#_hsl ) );
		}
		constructor( color ) {
			switch ( true ) {
				case typeof color == "string" :
					let rgba = {
						"r" : parseInt ( "0x" + color.substring ( 1, 3 ) ),
						"g" : parseInt ( "0x" + color.substring ( 3, 5 ) ),
						"b" : parseInt ( "0x" + color.substring ( 5, 7 ) ),
						"a" : 255
					};
					this.#_createRGB ( new _RGB ( rgba ) );
					break;
				case color instanceof _RGB :
					this.#_createRGB ( color.clone () );
					break;
				case color.rgb && ( color.rgb instanceof Array ):
					color = color.rgb;
				case "r" in color && "g" in color && "b" in color  :
					this.#_createRGB ( new _RGB ( color ) );
					break;
				case color instanceof _HSL:
					this.#_createHSL ( color.clone () );
					break;
				case color.hsl && ( color.hsl instanceof Array ):
					color = color.hsl;
				case "h" in color && "s" in color && "l" in color  :
					this.#_createHSL ( new _HSL ( color ) );
					break;
				case color instanceof _PICK :
					this.#_createPICK ( color.clone () );
					break;
				case color.pick && ( color.pick instanceof Array ):
					color = color.pick;
				case "hL" in color && "cL" in color && "bL" in color && "nbT" in color && "nbC" in color :
					this.#_createPICK ( new _PICK ( color ) );
					break;
				case color instanceof Color:
					this.#_rgb = color.rgb.clone ();
					this.#_hsl = color.hsl.clone ();
					this.#_pick = color.pick.clone ();
					break;
			}
		}
		get rgb() {
			return this.#_rgb;
		}
		set rgb( rgbColor ) {}
		get hsl() {
			return this.#_hsl;
		}
		set hsl( hslColor ) {}
		get pick() {
			return this.#_pick;
		}
		set pick( pickColor ) {}
		clone() {
			return new Color ( this );
		}
		equals( color ) {
			if (
					( color instanceof Color ) &&
					color.rgb.equals ( this.#_rgb ) &&
					color.hsl.equals ( this.#_hsl ) &&
					color.pick.equals ( this.#_pick )
					) return true;
			else return false;

		}
	}



	this.createColor = function ( color ) {
		let myColor = new Color ( color );
		return myColor;
	};

	this.createFullSaturatedRandomColor = function () {
		let pick = new _PICK ( {
			"hL" : Math.floor ( Math.random () * 48 ),
			"cL" : 7,
			"bL" : 0,
			"nbT" : 8,
			"nbC" : 48,
			"a" : 1
		} );
		return new Color ( pick );
	};
	this.createRandomColor = function () {
		let cL = Math.floor ( Math.random () * 7 );
		let pick = new _PICK ( {
			"hL" : Math.floor ( Math.random () * 48 ),
			"cL" : cL,
			"bL" : Math.floor ( Math.random () * ( 8 - ( 2 * cL - 1 ) ) ),
			"nbT" : 8,
			"nbC" : 48,
			"a" : 1
		} );
		return new Color ( pick );
	};

	this.isColor = function ( obj ) {
		return obj instanceof Color;
	};

} ).bind ( colorManager_ ) ();
