/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    contactlist: ComponentFramework.PropertyTypes.StringProperty;
    email: ComponentFramework.PropertyTypes.StringProperty;
    contactnumber: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    contactlist?: string;
    email?: string;
    contactnumber?: string;
}
