/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
var pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./mobileInput/index.ts"
/*!******************************!*\
  !*** ./mobileInput/index.ts ***!
  \******************************/
(__unused_webpack_module, exports) {

eval("{\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\nexports.MobileNumberControl = void 0;\nclass MobileNumberControl {\n  constructor() {\n    this.value = \"\";\n    this.prefixes = [\"50\", \"52\", \"54\", \"55\", \"56\", \"57\", \"58\"];\n  }\n  init(context, notifyOutputChanged, state, container) {\n    this.container = container;\n    this.notifyOutputChanged = notifyOutputChanged;\n    var wrapper = document.createElement(\"div\");\n    wrapper.className = \"mobile-wrapper\";\n    this.prefixDropdown = document.createElement(\"select\");\n    this.prefixDropdown.className = \"mobile-prefix\";\n    this.prefixes.forEach(prefix => {\n      var option = document.createElement(\"option\");\n      option.value = prefix;\n      option.text = prefix;\n      this.prefixDropdown.appendChild(option);\n    });\n    this.mobileInput = document.createElement(\"input\");\n    this.mobileInput.type = \"text\";\n    this.mobileInput.className = \"mobile-input\";\n    this.mobileInput.maxLength = 7;\n    this.mobileInput.placeholder = \"1234567\";\n    this.prefixDropdown.addEventListener(\"change\", () => {\n      this.updateValue();\n    });\n    this.mobileInput.addEventListener(\"input\", () => {\n      this.mobileInput.value = this.mobileInput.value.replace(/\\D/g, \"\");\n      this.updateValue();\n    });\n    wrapper.appendChild(this.prefixDropdown);\n    wrapper.appendChild(this.mobileInput);\n    this.container.appendChild(wrapper);\n  }\n  updateValue() {\n    var prefix = this.prefixDropdown.value || \"\";\n    var mobile = this.mobileInput.value || \"\";\n    this.value = prefix + mobile;\n    this.notifyOutputChanged();\n  }\n  updateView(context) {\n    var crmValue = context.parameters.value.raw || \"\";\n    // Disable/Enable control based on CRM field state\n    var isDisabled = context.mode.isControlDisabled;\n    this.prefixDropdown.disabled = isDisabled;\n    this.mobileInput.disabled = isDisabled;\n    if (document.activeElement !== this.mobileInput && document.activeElement !== this.prefixDropdown) {\n      if (crmValue.length >= 2) {\n        var prefix = crmValue.substring(0, 2);\n        var mobile = crmValue.substring(2);\n        if (this.prefixes.indexOf(prefix) > -1) {\n          this.prefixDropdown.value = prefix;\n        }\n        this.mobileInput.value = mobile;\n      } else {\n        this.prefixDropdown.value = \"50\";\n        this.mobileInput.value = \"\";\n      }\n      this.value = crmValue;\n    }\n  }\n  getOutputs() {\n    return {\n      value: this.value\n    };\n  }\n  destroy() {}\n}\nexports.MobileNumberControl = MobileNumberControl;\n\n//# sourceURL=webpack://pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad/./mobileInput/index.ts?\n}");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./mobileInput/index.ts"](0,__webpack_exports__);
/******/ 	pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad = __webpack_exports__;
/******/ 	
/******/ })()
;
if (window.ComponentFramework && window.ComponentFramework.registerControl) {
	ComponentFramework.registerControl('MobileNumberControl.MobileNumberControl', pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad.MobileNumberControl);
} else {
	var MobileNumberControl = MobileNumberControl || {};
	MobileNumberControl.MobileNumberControl = pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad.MobileNumberControl;
	pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad = undefined;
}