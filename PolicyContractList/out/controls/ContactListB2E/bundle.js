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

/***/ "./ContactListB2E/index.ts"
/*!*********************************!*\
  !*** ./ContactListB2E/index.ts ***!
  \*********************************/
(__unused_webpack_module, exports) {

eval("{\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\nexports.PolicyContactList = void 0;\nclass PolicyContactList {\n  constructor() {\n    this.contacts = [];\n    this.lastRaw = null;\n  }\n  init(context, notifyOutputChanged, state, container) {\n    this.container = container;\n    this.notifyOutputChanged = notifyOutputChanged;\n    var wrapper = document.createElement(\"div\");\n    // Header\n    var header = document.createElement(\"div\");\n    header.style.display = \"flex\";\n    header.style.justifyContent = \"space-between\";\n    header.style.alignItems = \"center\";\n    header.style.marginBottom = \"10px\";\n    var title = document.createElement(\"h3\");\n    title.innerText = \"Contact\";\n    title.style.margin = \"0\";\n    var addBtn = document.createElement(\"button\");\n    addBtn.innerText = \"+ Add New\";\n    addBtn.style.padding = \"6px 12px\";\n    addBtn.style.cursor = \"pointer\";\n    addBtn.onclick = () => {\n      var _a, _b;\n      var email = ((_a = context.parameters.email) === null || _a === void 0 ? void 0 : _a.raw) || \"\";\n      var mobile = ((_b = context.parameters.contactnumber) === null || _b === void 0 ? void 0 : _b.raw) || \"\";\n      this.addRow(email, mobile);\n    };\n    header.appendChild(title);\n    header.appendChild(addBtn);\n    this.gridRef = document.createElement(\"div\");\n    wrapper.appendChild(header);\n    wrapper.appendChild(this.gridRef);\n    this.container.appendChild(wrapper);\n  }\n  updateView(context) {\n    var _a, _b;\n    var raw = context.parameters.contactlist.raw;\n    if (raw !== this.lastRaw) {\n      this.lastRaw = raw;\n      try {\n        this.contacts = raw ? JSON.parse(raw) : [];\n      } catch (_c) {\n        this.contacts = [];\n      }\n    }\n    var email = ((_a = context.parameters.email) === null || _a === void 0 ? void 0 : _a.raw) || \"\";\n    var mobile = ((_b = context.parameters.contactnumber) === null || _b === void 0 ? void 0 : _b.raw) || \"\";\n    // Create initial row automatically\n    if (this.contacts.length === 0 && (email || mobile)) {\n      this.contacts.push({\n        id: Date.now(),\n        contactType: \"Primary\",\n        mobile: mobile,\n        office: \"\",\n        fax: \"\",\n        email: email,\n        website: \"\"\n      });\n      this.notifyOutputChanged();\n    }\n    this.renderGrid();\n  }\n  renderGrid() {\n    this.gridRef.innerHTML = \"\";\n    var grid = document.createElement(\"div\");\n    grid.className = \"grid-container\";\n    var headers = [\"#\", \"Contact Type\", \"Mobile\", \"Office\", \"Fax\", \"Email\", \"Website\", \"Action\"];\n    headers.forEach(h => {\n      var d = document.createElement(\"div\");\n      d.className = \"grid-header\";\n      d.innerText = h;\n      grid.appendChild(d);\n    });\n    this.contacts.forEach((row, idx) => {\n      var cell = el => {\n        var d = document.createElement(\"div\");\n        d.className = \"grid-cell\";\n        if (typeof el === \"string\") {\n          d.innerText = el;\n        } else {\n          d.appendChild(el);\n        }\n        return d;\n      };\n      grid.appendChild(cell((idx + 1).toString()));\n      // Contact Type\n      var type = document.createElement(\"select\");\n      [\"Primary\", \"Secondary\"].forEach(v => {\n        var o = document.createElement(\"option\");\n        o.value = v;\n        o.text = v;\n        if (v === row.contactType) {\n          o.selected = true;\n        }\n        type.appendChild(o);\n      });\n      type.onchange = () => {\n        row.contactType = type.value;\n        this.notifyOutputChanged();\n      };\n      grid.appendChild(cell(type));\n      // Input Helper\n      var createInput = (value, field) => {\n        var input = document.createElement(\"input\");\n        input.value = value || \"\";\n        input.style.width = \"95%\";\n        input.onchange = () => {\n          row[field] = input.value;\n          this.notifyOutputChanged();\n        };\n        return input;\n      };\n      grid.appendChild(cell(createInput(row.mobile, \"mobile\")));\n      grid.appendChild(cell(createInput(row.office, \"office\")));\n      grid.appendChild(cell(createInput(row.fax, \"fax\")));\n      grid.appendChild(cell(createInput(row.email, \"email\")));\n      grid.appendChild(cell(createInput(row.website, \"website\")));\n      // Delete Icon\n      var deleteBtn = document.createElement(\"button\");\n      deleteBtn.innerHTML = \"🗑\";\n      deleteBtn.title = \"Delete Contact\";\n      deleteBtn.style.border = \"none\";\n      deleteBtn.style.background = \"transparent\";\n      deleteBtn.style.cursor = \"pointer\";\n      deleteBtn.style.fontSize = \"18px\";\n      deleteBtn.style.color = \"#d13438\";\n      deleteBtn.style.padding = \"4px\";\n      deleteBtn.onmouseenter = () => {\n        deleteBtn.style.transform = \"scale(1.15)\";\n      };\n      deleteBtn.onmouseleave = () => {\n        deleteBtn.style.transform = \"scale(1)\";\n      };\n      deleteBtn.onclick = () => {\n        if (confirm(\"Delete this contact?\")) {\n          this.contacts.splice(idx, 1);\n          this.renderGrid();\n          this.notifyOutputChanged();\n        }\n      };\n      grid.appendChild(cell(deleteBtn));\n    });\n    this.gridRef.appendChild(grid);\n  }\n  addRow() {\n    var email = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : \"\";\n    var mobile = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : \"\";\n    this.contacts.push({\n      id: Date.now(),\n      contactType: \"Primary\",\n      mobile: mobile,\n      office: \"\",\n      fax: \"\",\n      email: email,\n      website: \"\"\n    });\n    this.renderGrid();\n    this.notifyOutputChanged();\n  }\n  getOutputs() {\n    return {\n      contactlist: JSON.stringify(this.contacts)\n    };\n  }\n  destroy() {\n    // Cleanup\n  }\n}\nexports.PolicyContactList = PolicyContactList;\n\n//# sourceURL=webpack://pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad/./ContactListB2E/index.ts?\n}");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./ContactListB2E/index.ts"](0,__webpack_exports__);
/******/ 	pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad = __webpack_exports__;
/******/ 	
/******/ })()
;
if (window.ComponentFramework && window.ComponentFramework.registerControl) {
	ComponentFramework.registerControl('B2EControl.PolicyContactList', pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad.PolicyContactList);
} else {
	var B2EControl = B2EControl || {};
	B2EControl.PolicyContactList = pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad.PolicyContactList;
	pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad = undefined;
}