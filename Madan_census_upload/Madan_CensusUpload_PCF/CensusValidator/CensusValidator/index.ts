import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as ReactDOM from "react-dom";
import { CensusValidator } from "./Components/CensusValidator";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";

export class CensusValidatorMain implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container: HTMLDivElement;
    private fileInput: HTMLInputElement;
    private notifyOutputChanged: () => void;
    private uploadedContent = "";
    private uploadedFileContent = "";
    private root!: Root;
    private apiResponse: string;
    private _context: ComponentFramework.Context<IInputs>;
    private _api_validate_response:string;


    /**
     * Empty constructor.
     */
    constructor() {
        // Empty
    }

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
     */
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        // Add control initialization code
        this._context = context;
        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;
        this.root = createRoot(container);
    }
    private renderControl(): void {

        this.root.render(React.createElement(CensusValidator, {
           label:      "Census Validation",
            buttonText: "Validate",
            _context:this._context,
            onButtonClick: async ():Promise<string> => {
                await this.onValidateClick();
               return this._api_validate_response;
            }
        }));
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        // Add code to update control view
        this.renderControl();
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
     */
    public getOutputs(): IOutputs {
        return {
            //uploadedFile: ""
           ValidatorResponse_:this._api_validate_response
        };
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void {
        // Add code to cleanup control if necessary
        //ReactDOM.unmountComponentAtNode(this.container);
        this.root.unmount();
    }
    
    private async onValidateClick(): Promise<void> {
        console.log("Validate clicked.");
const policyEntityId = (this._context.mode as any).contextInfo.entityId;
        console.log(`policy guid ${policyEntityId}`);

       const requestBody={
        "adnic_policy_guid":policyEntityId
       }

        const validator_json= await this.callCustomApi("adnic_census_validator",policyEntityId);
      let  isValid:string= validator_json.adnic_validation_response;
        this._api_validate_response=isValid;
        this.notifyOutputChanged();

        // const confirmStrings={
        //     title:"Census Validator",
        //     text:"Member count difference between Quote And Policy exceeds 10%. Please either delete the additional Members Or Regenerate the quote with the complete Member list and obtain signed approval from the Insured.",
        //     confirmButtonLabel:"Ok",
        //     cancelButtonLabel:"Cancel"
        // }
    //    await this._context.navigation.openConfirmDialog(confirmStrings).then(async (response)=>{
    //         if(response.confirmed){
    // }
    //     },(error)=>{
    //         console.log(error);
    //     });
    }

    private async callCustomApi(
    apiName: string,
    policyEntityId: string): Promise<any> {

    try {
        
        const request = {
            "adnic_policy_guid":policyEntityId,
            getMetadata: () => ({
                boundParameter:   null,
                operationType:    0,   // 0 = Action, 1 = Function
                operationName:    apiName,
                parameterTypes:   {
                adnic_policy_guid: {
                typeName: "Edm.String",
                structuralProperty: 1
                   },
                }
            })
        };

        const response = await (this._context.webAPI as any).execute(request);
        if (response.ok) {
            const result = await response.json();
            console.log("Custom API response:", result);
            return result;
        }

        throw new Error(`API call failed: ${response.status}`);
    }
    catch (error) {
        console.error("callCustomApi error:", error);
        throw error;
    }
}

}
