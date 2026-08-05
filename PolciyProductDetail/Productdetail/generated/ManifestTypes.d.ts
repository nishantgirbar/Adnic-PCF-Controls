/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    productDetailsInput: ComponentFramework.PropertyTypes.StringProperty;
    policyId: ComponentFramework.PropertyTypes.StringProperty;
    showPolicyQuotePremiumComparison: ComponentFramework.PropertyTypes.TwoOptionsProperty;
}
export interface IOutputs {
    productDetailsInput?: string;
}
