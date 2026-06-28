/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    showSummary: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    memberlistjson: ComponentFramework.PropertyTypes.StringProperty;
    categoryPremiums: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    showSummary?: boolean;
    memberlistjson?: string;
    categoryPremiums?: string;
}
