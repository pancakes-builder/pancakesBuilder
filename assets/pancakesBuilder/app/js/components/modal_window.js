(function() {
	var Modal = function(element) {
		this.element = element;
		this.triggers = document.querySelectorAll('[aria-controls="'+this.element.getAttribute('id')+'"]');
		console.log(this.triggers)
		this.firstFocusable = null;
		this.lastFocusable = null;
		this.selectedTrigger = null;
		this.showClass = "pb--modal--is-visible";
		this.initModal();
	};

	Modal.prototype.initModal = function() {
		var self = this;
		//open modal when clicking on trigger buttons
		if ( this.triggers ) {
			for(var i = 0; i < this.triggers.length; i++) {
				this.triggers[i].addEventListener('click', function(event) {
					event.preventDefault();
					self.selectedTrigger = event.target;
					self.showModal();
					self.initModalEvents();
				});
			}
		}

		// listen to the openModal event -> open modal without a trigger button
		this.element.addEventListener('openModal', function(event){
			if(event.detail) self.selectedTrigger = event.detail;
			self.showModal();
			self.initModalEvents();
		});
	};

	let trigger = (a, attribute) => {
		for ( ; a && a !== document; a = a.parentNode ) {
			if ( a.hasAttribute(attribute) ) return a.getAttribute(attribute);
		}
		return null;
	}

	Modal.prototype.showModal = function() {
		let trig = trigger(this.selectedTrigger, "pb-editor-mode");
		let mode = trig, item, box = this.element.querySelector(".pb--modal__body");
		if (mode === "text") {
			mode = "htmlmixed", item = _('[pb-editing="1"]');
			box.innerHTML = `<textarea>${item.innerHTML}</textarea>`;
			box = box.querySelector("textarea");
		} else if (mode === "css") {
			mode = "css", item = _('style.pageCss');
			box.innerHTML = `<textarea>${item.innerHTML}</textarea>`;
			box = box.querySelector("textarea");
		} else if (mode === "yml") {
			mode = "yaml";
			box.innerHTML = `<textarea>${exportYml()}</textarea>`;
			box = box.querySelector("textarea");
			item = false;
		} else if (mode === "params") {
			box.innerHTML = _('[pb-content="params"]').innerHTML;
			box = this.element.querySelector('.pb--modal__body');
			item = _(".builderUIComponents [pb-content='params'] form")
		} else if (mode === "media") {
			item = item = _('[pb-editing="1"] > img');
			box.innerHTML = _('.builderUIComponents [pb-content="media"]').innerHTML;
			//box = this.element.querySelector('.modal__body');
		}
		//console.log("mode: ", mode)
		//console.log("box: ", box)

		//console.log("modal", item);
		Util.addClass(this.element, this.showClass);
		this.getFocusableElements();
		this.firstFocusable.focus();
		this.createEditor(box, mode, item);
		this.emitModalEvents('modalIsOpen');
	};

	Modal.prototype.createEditor = function(textArea, mode, item) {
		let content, editor;
		//console.log("texArea: ", textArea)
		if (textArea.type === "textarea") {
			editor = CodeMirror.fromTextArea(textArea, {
				lineNumbers: true,
				lineWrapping: true,
				autofocus: true,
				showCursorWhenSelecting: true,
				value: textArea.value,
				mode: mode
			});
		} else if (mode === "media") {
			let imgSrc = (e) => {
				_All(`.pb--modal__body img`).forEach((image) => {
					if (image === e.currentTarget) {
						image.classList.add("img-selected");
					} else {
						image.classList.remove("img-selected")
					}
				})
				content = e.currentTarget;
				//console.log("src-full", content)
				
			}
			this.element.querySelectorAll('.pb--modal__body img').forEach((image) => {
				image.addEventListener("click", imgSrc, false);
			})
		}

		this.element.setAttribute("pb-mode", mode);
		
		let context = this;
		let closeSave = () => {
			if (textArea.type === "textarea") {
				content = editor.getValue();
			} else if (textArea.querySelector("input")) {
				content = textArea.querySelectorAll("input");
			}
			context.saveEditor(content, item);
			this.element.removeEventListener('modalIsClose', closeSave, false);
		}
		this.element.addEventListener('modalIsClose', closeSave, false);
	};

	Modal.prototype.saveEditor = function(editor, item) {
		if (isObject(editor)) {
			Object.entries(editor).forEach((key, i) => {
				//console.log("key: ", key[0], "value: ", key[1])
			});
		} else if (item.tagName === "IMG") {
			item.parentNode.replaceChild(editor, item);
			
			//item.parentNode.setAttribute("data-pb-image", editor)
		} else if (isNodeList(editor)) {
			// HTML nodelist
			console.log("isNodeList", editor)
			editor.forEach((input) => {
				if (input.tagName === "INPUT") {
					input.defaultValue = input.value;
					//console.log("input valiue", input.value)
				} else {
					console.log("unknown nodeList")
				}
				
				//item.parentNode.replaceChild(_(".modal__body form"), item);
			});
			item.parentNode.replaceChild(_(".pb--modal__body form"), item);
			//console.log("item, ", item, "editor", _(".modal__body form"))
		} else if (!item) {
			// Do nothing because it's probably YAML
		} else {
			console.log("else", item)
			item.innerHTML = editor;
		}
		//updateIframe();
	}

	Modal.prototype.destroyEditor = function() {
		this.element.querySelector(".pb--modal__body").innerHTML = "";
		//console.log("editor destroyed", CodeMirror())
	}

	Modal.prototype.closeModal = function() {
		console.log("close MODAL")
		//this.saveEditor();
		Util.removeClass(this.element, this.showClass);
		this.firstFocusable = null;
		this.lastFocusable = null;
		if(this.selectedTrigger) this.selectedTrigger.focus();
		//remove listeners
		this.cancelModalEvents();
		this.emitModalEvents('modalIsClose');
		this.destroyEditor();
	};

	Modal.prototype.initModalEvents = function() {
		//add event listeners
		this.element.addEventListener('keydown', this);
		this.element.addEventListener('click', this);
	};

	Modal.prototype.cancelModalEvents = function() {
		//remove event listeners
		this.element.removeEventListener('keydown', this);
		this.element.removeEventListener('click', this);
	};

	Modal.prototype.handleEvent = function (event) {
		switch(event.type) {
			case 'click': {
				this.initClick(event);
			}
			case 'keydown': {
				this.initKeyDown(event);
			}
		}
	};

	Modal.prototype.initKeyDown = function(event) {
		if( event.keyCode && event.keyCode == 27 || event.key && event.key == 'Escape' ) {
			//close modal window on esc
			this.closeModal();
		} else if( event.keyCode && event.keyCode == 9 || event.key && event.key == 'Tab' ) {
			//trap focus inside modal
			this.trapFocus(event);
		}
	};

	Modal.prototype.initClick = function(event) {
		if( event.target.closest('[pb-function="fullscreen-modal"]') ) {
			this.element.classList.toggle("pb--modal--full-screen");
			return;
		}
		//close modal when clicking on close button or x
		if( !event.target.closest('.pb--js-modal__close') ) return;
		event.preventDefault();
		this.closeModal();
	};

	Modal.prototype.trapFocus = function(event) {
		if( this.firstFocusable == document.activeElement && event.shiftKey) {
			//on Shift+Tab -> focus last focusable element when focus moves out of modal
			event.preventDefault();
			this.lastFocusable.focus();
		}
		if( this.lastFocusable == document.activeElement && !event.shiftKey) {
			//on Tab -> focus first focusable element when focus moves out of modal
			event.preventDefault();
			this.firstFocusable.focus();
		}
	}

	Modal.prototype.getFocusableElements = function() {
		//get all focusable elements inside the modal
		var allFocusable = this.element.querySelectorAll('[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable], audio[controls], video[controls], summary');
		this.getFirstVisible(allFocusable);
		this.getLastVisible(allFocusable);
	};

	Modal.prototype.getFirstVisible = function(elements) {
		//get first visible focusable element inside the modal
		for(var i = 0; i < elements.length; i++) {
			if( elements[i].offsetWidth || elements[i].offsetHeight || elements[i].getClientRects().length ) {
				this.firstFocusable = elements[i];
				return true;
			}
		}
	};

	Modal.prototype.getLastVisible = function(elements) {
		//get last visible focusable element inside the modal
		for(var i = elements.length - 1; i >= 0; i--) {
			if( elements[i].offsetWidth || elements[i].offsetHeight || elements[i].getClientRects().length ) {
				this.lastFocusable = elements[i];
				return true;
			}
		}
	};

	Modal.prototype.emitModalEvents = function(eventName) {
		var event = new CustomEvent(eventName, {detail: this.selectedTrigger});
		this.element.dispatchEvent(event);
	};

	//initialize the Modal objects
	var modals = document.getElementsByClassName('pb--js-modal');
	if( modals.length > 0 ) {
		for( var i = 0; i < modals.length; i++) {
			(function(i){new Modal(modals[i]);})(i);
		}
	}

	// Generate YML
	let exportYml = () => {
		let sections = _All("main [data-pb-template-level='1']");
		let rows, columns, elements, indent;
		let yml = `---\n`;
		let params = _All("[pb-content='params'] label, [pb-content='params'] input, .pageCss");

		let key, value, prefix;
		params.forEach((param, index) => {
			
				key = param.getAttribute("data-pb-key");
				value = param.value;
				if (key === "page_css") {
					//let cleanH = param.innerHTML.replace(/\s+/g,'');
					let cleanH = param.innerHTML;
					value = `|\n  ${cleanH}`;
				}
				console.log("key", key, value)
				if ( (key != undefined && key != null) && (value != undefined || value != null) ) {
					yml += `${key}: ${value}\n`;
				}
		});
		yml += "stacks:\n";
		// Loop through each draggable item within <main> tags, then get the data-attributes, then generate the YML.
		const ymlString = (item, index) => {
			// Index: the current index of the draggable section, row, or column
			// i: the current key index
			let keys = Object.entries(item.dataset);
			let yml = "";
			let indent, prefix, name, value, level = item.getAttribute("data-pb-template-level");
			// iterate through each data-pb and grab the value
			// the order matches the order in the markup
			keys.forEach((key, i) => {      
		
				// YML format:
				// name: value
				name = key[0], value = `${key[1]}\n`;
				// replace camelcase with dash format. Remove data-pb prefix so it matches our desirable YML
				name = `${camelToDash(name).replace("pb-", "")}:`;
					// For the first key index (i), use a dash in the prefix. We assume it's - template: for the first key index
					if (i === 0) {
						prefix = "- ";
					} else {
						prefix = "  ";
					}
					// For each draggable item, the YML indent will vary slightly. 
					if (level === "1" ) {
						indent = "  "
					} else if (level === "2") {
						indent = "    "            
					} else if (level === "3") {
						indent = "      "            
					} else if (level === "4") {
						indent = "        "
					}
					// In our YML, each nested loop is started like this: "level-name:". However, this is only added once per loop level, so we compare the item index with the data index (i).
					if (level === "1") {
					} else if ((index === 0 && i === 0)) {
						yml += `${indent}${level}s:\n`;
					} else if (item.getAttribute("data-pb-element-type") === "text") {
						//yml += `${indent}${prefix}html: |\n`;
						let cleanH = item.innerHTML.replace(/\s+/g,'');
						yml += `${indent}${prefix}html: |\n${indent}${prefix}  ${cleanH}\n`;
					}
				yml += `${indent}${prefix}${name} ${value}`;
			});
			return yml;
		}
		sections.forEach((section, index) => {
			yml += ymlString(section, index);
	
			rows = section.querySelectorAll("main [data-pb-template-level='2']");
			rows.forEach((row, index) => {
				yml += ymlString(row, index);
	
				columns = row.querySelectorAll("main [data-pb-template-level='3']");
					columns.forEach((column, index) => {
						yml += ymlString(column, index);
	
						elements = column.querySelectorAll("main [data-pb-template-level='4']");
						elements.forEach((element, index) => {
							yml += ymlString(element, index);
						});
					});
			});
		});
		yml += `---\n`;
		// CodeMirror(function(elt) {
		//   textArea.parentNode.replaceChild(elt, textArea);
		// }, {value: textArea.value});
		return yml;
	}
}());