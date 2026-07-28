/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    inputType: ComponentFramework.PropertyTypes.StringProperty;
    placeholder: ComponentFramework.PropertyTypes.StringProperty;
    maxLength: ComponentFramework.PropertyTypes.WholeNumberProperty;
    alphabetsOnly: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    value: ComponentFramework.PropertyTypes.Property;
}
export interface IOutputs {
    value?: any;
}
