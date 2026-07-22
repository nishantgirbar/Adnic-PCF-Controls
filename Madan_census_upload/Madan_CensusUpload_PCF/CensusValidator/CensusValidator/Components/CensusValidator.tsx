import * as React from "react";
import { useState } from "react";
import {buttonRowStyles, ButtonStyle,buttonStyles,containerStyles,itemStyles, labelRowStyles, line2Styles, stackTokens} from "../css/styles";
import {
    Stack,
    Label,
    DefaultButton,
    PrimaryButton,
    IStackStyles,
    IStackTokens,
    IButtonStyles,
    Spinner,
    SpinnerSize,
    MessageBar,
    MessageBarType,
    ITextStyles
} from "@fluentui/react";
import { IInputs } from "../generated/ManifestTypes";
import { UploadValidationResponse } from "./interfaces";

export interface ICensusValidatorProps {
    label: string;
    buttonText: string;
    isDisabled?: boolean;
    onButtonClick: () => Promise<string>;
    _context:ComponentFramework.Context<IInputs>,
}

export const CensusValidator: React.FC<ICensusValidatorProps> = (props) => {

    const [isLoading, setIsLoading] = useState(false);
    const [message,   setMessage]   = useState<string | null>(null);
    const [isError,   setIsError]   = useState(false);

    const getEnvironmentalVariables = async (schemaname: string): Promise<string> => {
        let finalValue = "";
        const result = await props._context.webAPI.retrieveMultipleRecords(
            "environmentvariabledefinition",
            `?$select=schemaname
      &$filter=schemaname eq '${schemaname}'
      &$expand=environmentvariabledefinition_environmentvariablevalue($select=value)`
        );

        if (result.entities.length > 0) {
            const envVar = result.entities[0];

            const values = envVar.environmentvariabledefinition_environmentvariablevalue;

            if (values && values.length > 0) {
                const value = values[0].value;
                finalValue = value;
                console.log(value);
            }
        }
        console.log(finalValue);
        return finalValue;
    }
    const iterateQuote=async ():Promise<void>=>{
        var recId= (props._context.mode as any).contextInfo.entityId.replace("{","").replace("}","");
                   var entityName=(props._context.mode as any).contextInfo.entityTypeName;
                    const fetchXml=`<fetch>
                    <entity name="adnic_external_data">
                        <attribute name="adnic_external_dataid" />
                        <attribute name="adnic_json_string" />
                        <attribute name="adnic_json_updated_staring" />
                        <filter>
                        <condition attribute="adnic_policy_guid" operator="eq" value="${recId}" />
                        <condition attribute="adnic_name" operator="eq" value="CensusUpload" />
                        <condition attribute="statecode" operator="eq" value="0" />
                        </filter>
                    </entity>
                    </fetch>`;

                    const result = await props._context.webAPI.retrieveMultipleRecords(
                        "adnic_external_data",
                        "?fetchXml=" + encodeURIComponent(fetchXml)
                        );
                    console.log(result.entities);

                  const original_json=  result.entities[0]["adnic_json_string"];
                  const updated_json=  result.entities[0]["adnic_json_updated_staring"];

                  let json_obj:UploadValidationResponse;

                  if(updated_json!==""){
                    json_obj=JSON.parse(updated_json)
                  }
                  else{
                     json_obj=JSON.parse(original_json)
                  }

                  const policyRec=await props._context.webAPI.retrieveRecord(entityName,recId,"?$select=adnic_adnic_quoteid");
                  const quoteNo= policyRec!==null? policyRec["adnic_adnic_quoteid"] as string : "";

                  const quote_fetchXml=`<fetch>
                                <entity name="adnic_quote">
                                    <attribute name="adnic_status" />
                                    <attribute name="adnic_adnic_quoteid" />
                                    <attribute name="adnic_quoteid" />
                                    <filter>
                                    <condition attribute="adnic_adnic_quoteid" operator="eq" value="${quoteNo}" />
                                    <condition attribute="statecode" operator="eq" value="0" />
                                    </filter>
                                </entity>
                                </fetch>`;

                  const quote_result = await props._context.webAPI.retrieveMultipleRecords(
                        "adnic_quote",
                        "?fetchXml=" + encodeURIComponent(quote_fetchXml)
                        );
                    console.log(quote_result.entities);

                   const quote_status= quote_result.entities[0]["adnic_status"];

                    try {

                   let quote_ite_url= await getEnvironmentalVariables("adnic_census_quote_iteration");
                  let final_url= quote_ite_url.replace("{quote_id}",quoteNo);

                      const req_body=  JSON.stringify({
                            status: quote_status,
                            members: json_obj.members
                        });

                    const response = await fetch(final_url, {
                        method: "POST",
                        headers: { Accept: "application/json" },
                        body:req_body
                    });
                
                    const rawText = await response.text();
                    let parsed: unknown;
                    try {
                        parsed = JSON.parse(rawText);
                    } catch {
                        
                    }
                    
                    } catch (err: unknown) {
                    //   this._showError(err instanceof Error ? err.message : "Network error");

                    }
    }
    const handleButtonClick = async (): Promise<void> => {
        try {
            setIsLoading(true);
            setMessage(null);
            setIsError(false);
            
           const response= await props.onButtonClick();
            if(response && response.includes("Exception") || response.includes("error")){
                setIsError(true);
                setMessage("There is an error while validating.");
            }
            else if(response.includes("new_member_found_mismatch_medical")){
              const result= await  props._context.navigation.openConfirmDialog({
                    text:"Newly added members in the policy Census have medical declarations or exceed the permissible age limit. Please either remove the additional members or initiate a quote iteration, obtain Underwriter approval,and upload the signed approval from the insured.",
                    title:"Newly added",
                    confirmButtonLabel:"Iterate Quote",
                     cancelButtonLabel:"Cancel"
                },{
                    height:200,
                    width:400
                });

                if(result.confirmed){
                    //iterate quote
                  await iterateQuote();
                }
            }
            else if(response.includes("census_count_greater")){
                 const confirmStrings={
            title:"Census Validator",
            text:"Member count difference between Quote And Policy exceeds 10%. Please either delete the additional Members Or Regenerate the quote with the complete Member list and obtain signed approval from the Insured.",
            confirmButtonLabel:"Iterate Quote",
            cancelButtonLabel:"Cancel"
                 }

            await props._context.navigation.openConfirmDialog(confirmStrings).then(async (response)=>{
            if(response.confirmed){
                   await iterateQuote();
            }
        });
            }
            else{
            //setMessage("Operation completed successfully.");
            setIsError(false);
            }
        }
        catch (error) {
            console.error("Button click error:", error);
            setMessage("There is an error while validating.");
            setIsError(true);
        }
        finally {
            setIsLoading(false);
        }
    };

    return (
        <Stack styles={containerStyles} tokens={stackTokens}>

            {/* Row 1 — Label */}
             <Stack styles={labelRowStyles}>
                <Label  styles={line2Styles}>
                    Info:
                    </Label>
                <Label styles={line2Styles}>
                    Member Count Difference Between Quote And Policy Exceeds 10%. Please Either Delete The Additional Members Or Regenerate The Quote With The Complete Member List And Obtain Signed Approval From The Insured.
                </Label>
            </Stack>

            {/* Message Bar */}
            {message && (
                <MessageBar
                    messageBarType={
                        isError
                            ? MessageBarType.error
                            : MessageBarType.success
                    }
                    onDismiss={() => setMessage(null)}
                    dismissButtonAriaLabel="Close">
                    {message}
                </MessageBar>
            )}

            {/* Row 2 — Button right aligned */}
            <Stack
                styles={buttonRowStyles}
                horizontal
                horizontalAlign="end">

                {isLoading ? (
                    <Spinner size={SpinnerSize.small} label="Processing..." />
                ) : (
                    <PrimaryButton
                        text={props.buttonText}
                        styles={buttonStyles}
                        disabled={props.isDisabled || isLoading}
                        onClick={handleButtonClick}
                    />
                )}

            </Stack>

        </Stack>
    );
};