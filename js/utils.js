function storageAvailable( type ) {
	try {
		var storage = window[type],
				x = '__storage_test__';
		storage.setItem ( x, x );
		storage.removeItem ( x );
		return true;
	} catch ( e ) {
		return e instanceof DOMException && (
				// everything except Firefox
				e.code === 22 ||
				// Firefox
				e.code === 1014 ||
				// test name field too, because code might not be present
				// everything except Firefox
				e.name === 'QuotaExceededError' ||
				// Firefox
				e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ) &&
				// acknowledge QuotaExceededError only if there's something already stored
				storage.length !== 0;
	}
}

function storeMyCycles( dataObj ) {
	if ( storageAvailable ( 'localStorage' ) ) {
		try {
			window.localStorage.setItem ( "myCycles", JSON.stringify ( dataObj ) );
		} catch ( e ) {

		}
	} else {
		// Too bad, no localStorage for us
	}
}


class ClassError extends Error {
	constructor( className, expected, fileName, infos ) {
		super ( className );
		let _className = className ? ` : ${ className }` : "";
		let _expected = expected ? `\n	Expected Class : ${ expected }	` : "";
		let _fileName = fileName ? `\n	FileName : ${ fileName }	` : "";
		let _infos = infos ? `\n	Infos : ${ infos }	` : "";
		console.log (
				`%c========[ Class Error${ _className } ]========\n%c${ _expected }${ _fileName }${ _infos }\n`,
				`background-color: darkred; color: white`,
				`background-color: maroon; color: white`
				);
	}
}


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


class YesNoPopup {
	#_noCallback;
	#_yesCallback;
	#_destinationNode;
	#_pop_noNode;
	#_pop_yesNode;
	#_popup = document.importNode ( document.querySelector ( "#yesnopopupTemplate" ).content, true ).querySelector ( ".popup-main" );

	constructor( yesTxt, noTxt, title, txt, yesCallback, noCallback, szW, szH, destinationNode, hidden ) {
		let _noTxt = noTxt || "No";
		let _yesTxt = yesTxt || "Yes";
		let _title = title || "";
		let _txt = txt || "";

		this.#_noCallback = noCallback || function () {};
		this.#_yesCallback = yesCallback || function () {};
		this.#_destinationNode = destinationNode || document.body;

		let pop_titleNode = this.#_popup.querySelector ( "[data-for=title]" );
		let pop_textNode = this.#_popup.querySelector ( "[data-for=text]" );
		this.#_pop_noNode = this.#_popup.querySelector ( "[data-useas=no]" );
		this.#_pop_yesNode = this.#_popup.querySelector ( "[data-useas=yes]" );
		let pop_noTxtNode = this.#_popup.querySelector ( "[data-for=noTxt]" );
		let pop_yesTxtNode = this.#_popup.querySelector ( "[data-for=yesTxt]" );

		this.#_pop_noNode.addEventListener ( "click", this.#_onClick_no.bind ( this ) );
		this.#_pop_yesNode.addEventListener ( "click", this.#_onClick_yes.bind ( this ) );

		pop_titleNode.innerHTML = _title;
		pop_textNode.innerHTML = _txt;
		pop_noTxtNode.innerHTML = _noTxt;
		pop_yesTxtNode.innerHTML = _yesTxt;

		if ( hidden ) {
			this.close ();
		}

		this.#_destinationNode.appendChild ( this.#_popup );
	}
	#_onClick_yes() {
		if ( this.#_yesCallback instanceof Function ) this.#_yesCallback ();
		this.kill ();
	}
	#_onClick_no() {
		if ( this.#_noCallback instanceof Function ) this.#_noCallback ();
		this.kill ();
	}
	close() {
		this.#_popup.hidden = true;
	}
	open() {
		this.#_popup.hidden = false;
	}
	kill() {
		this.#_pop_noNode.removeEventListener ( "click", this.#_onClick_no );
		this.#_pop_yesNode.removeEventListener ( "click", this.#_onClick_yes );
		this.#_destinationNode.removeChild ( this.#_popup );
	}
}

class SimpleInput {
	#_noCallback;
	#_yesCallback;
	#_destinationNode;
	#_pop_inputNode;
	#_pop_cancelNode;
	#_pop_validateNode;
	#_isActive = false;
	#_popup = document.importNode ( document.querySelector ( "#simpleinputTemplate" ).content, true ).querySelector ( ".popup-main" );

	constructor( validateTxt, cancelTxt, title, placeHolder, yesCallback, noCallback, szW, szH, destinationNode, hidden ) {
		let _cancelTxt = cancelTxt || "Annuler";
		let _validateTxt = validateTxt || "Valider";
		let _title = title || "";
		let _placeHolder = placeHolder || "";

		this.#_noCallback = noCallback || function () {};
		this.#_yesCallback = yesCallback || function () {};
		this.#_destinationNode = destinationNode || document.body;

		let _pop_titleNode = this.#_popup.querySelector ( "[data-for=title]" );
		this.#_pop_inputNode = this.#_popup.querySelector ( ".popup-input" );
		this.#_pop_cancelNode = this.#_popup.querySelector ( "[data-useas=cancel]" );
		this.#_pop_validateNode = this.#_popup.querySelector ( "[data-useas=validate]" );
		let _pop_cancelTxtNode = this.#_popup.querySelector ( "[data-for=cancelTxt]" );
		let _pop_validateTxtNode = this.#_popup.querySelector ( "[data-for=validateTxt]" );

		document.addEventListener ( "keydown", this.#_onKeydown.bind ( this ) );
		this.#_pop_cancelNode.addEventListener ( "click", this.#_onClick_cancel.bind ( this ) );
		this.#_pop_validateNode.addEventListener ( "click", this.#_onClick_validate.bind ( this ) );

		this.#_pop_inputNode.placeholder = _placeHolder;
		_pop_titleNode.innerHTML = _title;
		_pop_cancelTxtNode.innerHTML = _cancelTxt;
		_pop_validateTxtNode.innerHTML = _validateTxt;

		if ( hidden ) {
			this.close ();
			this.#_isActive = false;
		} else {
			this.#_isActive = true;
		}

		this.#_destinationNode.appendChild ( this.#_popup );
	}
	#_onClick_validate() {
		let val = this.#_pop_inputNode.value;
		if ( val === "" ) {
			return;
		}
		if ( this.#_yesCallback instanceof Function ) this.#_yesCallback ( val );
		this.kill ();
	}
	#_onClick_cancel() {
		if ( this.#_noCallback instanceof Function ) this.#_noCallback ( this.#_pop_inputNode.value );
		this.kill ();
	}
	close() {
		this.#_isActive = false;
		this.#_popup.hidden = true;
	}
	open() {
		this.#_isActive = true;
		this.#_popup.hidden = false;
	}
	kill() {
		this.#_isActive = false;
		document.removeEventListener ( "keydown", this.#_onKeydown.bind ( this ) );
		this.#_pop_cancelNode.removeEventListener ( "click", this.#_onClick_cancel );
		this.#_pop_validateNode.removeEventListener ( "click", this.#_onClick_validate );
		this.#_destinationNode.removeChild ( this.#_popup );
	}
	#_onKeydown( e ) {
		if ( ! this.#_isActive ) return;
		e.stopPropagation ( );
		let k = e.key;
		switch ( k ) {
			case "Enter" :
				this.#_onClick_validate ();
				break;
			case "Escape" :
				this.#_onClick_cancel ();
				break;
		}
	}
}



//let myPop = new YesNoPopup ( "Oui", "Non", "Suppression de ché pas quoi", "c'est vrraiment décidé ?" );
//let myInput = new SimpleInput ( null, null, "Nouveau nom ?", "Ancien" );