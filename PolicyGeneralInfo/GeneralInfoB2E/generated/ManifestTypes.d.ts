/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    memberData: ComponentFramework.PropertyTypes.StringProperty;
    adnic_name: ComponentFramework.PropertyTypes.StringProperty;
    enableUpload: ComponentFramework.PropertyTypes.TwoOptionsProperty;
}
export interface IOutputs {
    memberData?: string;
    adnic_name?: string;
}
