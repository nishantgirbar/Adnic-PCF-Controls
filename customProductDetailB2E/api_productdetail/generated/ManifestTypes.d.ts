/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    apiUrl: ComponentFramework.PropertyTypes.StringProperty;
    categoryCodes: ComponentFramework.PropertyTypes.StringProperty;
    adnic_name: ComponentFramework.PropertyTypes.StringProperty;
    adnic_memberlistjson: ComponentFramework.PropertyTypes.StringProperty;
    adnic_productdetails: ComponentFramework.PropertyTypes.StringProperty;
    categoryPremiums: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    categoryCodes?: string;
    adnic_name?: string;
    adnic_memberlistjson?: string;
    adnic_productdetails?: string;
}
