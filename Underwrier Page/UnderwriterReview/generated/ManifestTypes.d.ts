/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    quoteId: ComponentFramework.PropertyTypes.WholeNumberProperty;
    quoteNumber: ComponentFramework.PropertyTypes.StringProperty;
    apiUrl: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    quoteId?: number;
    quoteNumber?: string;
}
