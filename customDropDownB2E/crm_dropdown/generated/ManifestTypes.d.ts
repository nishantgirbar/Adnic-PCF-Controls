/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    selectedValue: ComponentFramework.PropertyTypes.StringProperty;
    apiUrl: ComponentFramework.PropertyTypes.StringProperty;
    dataKey: ComponentFramework.PropertyTypes.StringProperty;
    valueField: ComponentFramework.PropertyTypes.StringProperty;
    labelField: ComponentFramework.PropertyTypes.StringProperty;
    filterField: ComponentFramework.PropertyTypes.StringProperty;
    filterValue: ComponentFramework.PropertyTypes.StringProperty;
    defaultValue: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    selectedValue?: string;
}
