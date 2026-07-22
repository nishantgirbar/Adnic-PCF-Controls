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

/***/ "./customInput/index.ts"
/*!******************************!*\
  !*** ./customInput/index.ts ***!
  \******************************/
(__unused_webpack_module, exports) {

eval("{\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\nexports.InputPCF = void 0;\nclass InputPCF {\n  constructor() {\n    this.isDisabled = false;\n    this.value = \"\";\n    this.isDateField = false;\n    this.isDateTimeField = false;\n    this.onInputChange = e => {\n      var target = e.target;\n      if (this.maxLength !== undefined && target.value.length > this.maxLength) {\n        target.value = target.value.slice(0, this.maxLength);\n      }\n      this.value = this.isDateField ? this.parseDateInput(target.value) : target.value;\n      this.notifyOutputChanged();\n    };\n  }\n  twoDigits(value) {\n    return value < 10 ? \"0\".concat(value) : String(value);\n  }\n  formatDateForInput(value) {\n    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {\n      return typeof value === \"string\" ? value : \"\";\n    }\n    var year = value.getFullYear();\n    var month = this.twoDigits(value.getMonth() + 1);\n    var day = this.twoDigits(value.getDate());\n    var date = \"\".concat(year, \"-\").concat(month, \"-\").concat(day);\n    if (!this.isDateTimeField) {\n      return date;\n    }\n    var hours = this.twoDigits(value.getHours());\n    var minutes = this.twoDigits(value.getMinutes());\n    return \"\".concat(date, \"T\").concat(hours, \":\").concat(minutes);\n  }\n  parseDateInput(value) {\n    if (!value) {\n      return undefined;\n    }\n    if (this.isDateTimeField) {\n      return new Date(value);\n    }\n    var parts = value.split(\"-\").map(Number);\n    return new Date(parts[0], parts[1] - 1, parts[2]);\n  }\n  init(context, notifyOutputChanged, state, container) {\n    this.container = container;\n    this.notifyOutputChanged = notifyOutputChanged;\n    this.inputElement = document.createElement(\"input\");\n    this.inputElement.className = \"custom-input\";\n    this.inputElement.addEventListener(\"input\", this.onInputChange);\n    this.container.appendChild(this.inputElement);\n    this.value = context.parameters.value.raw || \"\";\n    this.inputElement.value = this.formatDateForInput(context.parameters.value.raw);\n  }\n  updateView(context) {\n    var _a, _b, _c;\n    var configuredType = (context.parameters.inputType.raw || \"text\").toLowerCase();\n    var mappedFieldType = context.parameters.value.type.toLowerCase();\n    this.isDateTimeField = mappedFieldType === \"datetime.dateandtime\";\n    this.isDateField = mappedFieldType === \"datetime.dateonly\" || this.isDateTimeField;\n    var supportedTypes = [\"text\", \"number\", \"email\", \"tel\", \"password\"];\n    this.inputElement.type = this.isDateField ? this.isDateTimeField ? \"datetime-local\" : \"date\" : supportedTypes.indexOf(configuredType) > -1 ? configuredType : \"text\";\n    this.inputElement.placeholder = ((_a = context.parameters.placeholder) === null || _a === void 0 ? void 0 : _a.raw) || \"Enter value\";\n    var configuredMaxLength = context.parameters.maxLength.raw;\n    this.maxLength = configuredMaxLength !== null && configuredMaxLength >= 0 ? configuredMaxLength : undefined;\n    if (this.maxLength === undefined) {\n      this.inputElement.removeAttribute(\"maxlength\");\n    } else {\n      this.inputElement.maxLength = this.maxLength;\n    }\n    var rawCrmValue = (_b = context.parameters.value.raw) !== null && _b !== void 0 ? _b : \"\";\n    var crmValue = this.formatDateForInput(rawCrmValue);\n    // Disable when CRM field/form is disabled\n    var isDisabled = context.mode.isControlDisabled || ((_c = context.parameters.value.security) === null || _c === void 0 ? void 0 : _c.editable) === false;\n    this.inputElement.disabled = isDisabled;\n    // IMPORTANT:\n    // Never overwrite textbox while user is typing.\n    if (document.activeElement !== this.inputElement && this.inputElement.value !== crmValue) {\n      this.inputElement.value = crmValue;\n      this.value = rawCrmValue;\n    }\n  }\n  getOutputs() {\n    return {\n      value: this.value\n    };\n  }\n  destroy() {\n    var _a;\n    (_a = this.inputElement) === null || _a === void 0 ? void 0 : _a.removeEventListener(\"input\", this.onInputChange);\n  }\n}\nexports.InputPCF = InputPCF;\n\n//# sourceURL=webpack://pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad/./customInput/index.ts?\n}");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./customInput/index.ts"](0,__webpack_exports__);
/******/ 	pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad = __webpack_exports__;
/******/ 	
/******/ })()
;
if (window.ComponentFramework && window.ComponentFramework.registerControl) {
	ComponentFramework.registerControl('crmInput.InputPCF', pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad.InputPCF);
} else {
	var crmInput = crmInput || {};
	crmInput.InputPCF = pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad.InputPCF;
	pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad = undefined;
}