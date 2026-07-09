/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    quoterecordId: ComponentFramework.PropertyTypes.WholeNumberProperty;
    quoteNumber: ComponentFramework.PropertyTypes.StringProperty;
    adnic_name: ComponentFramework.PropertyTypes.StringProperty;
    adnic_productdetails: ComponentFramework.PropertyTypes.StringProperty;
    apiUrl: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    quoterecordId?: number;
    quoteNumber?: string;
    adnic_name?: string;
    adnic_productdetails?: string;
}
