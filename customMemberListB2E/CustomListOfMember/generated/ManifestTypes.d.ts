/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    memberData: ComponentFramework.PropertyTypes.StringProperty;
    listOfMemberAbove65: ComponentFramework.PropertyTypes.StringProperty;
    uniqueCategoriesJson: ComponentFramework.PropertyTypes.StringProperty;
    policy_start_date: ComponentFramework.PropertyTypes.DateTimeProperty;
    enableUpload: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    adnic_name: ComponentFramework.PropertyTypes.StringProperty;
    adnic_adnic_showebpplan: ComponentFramework.PropertyTypes.TwoOptionsProperty;
}
export interface IOutputs {
    memberData?: string;
    listOfMemberAbove65?: string;
    uniqueCategoriesJson?: string;
    policy_start_date?: Date;
    adnic_name?: string;
    adnic_adnic_showebpplan?: boolean;
}
