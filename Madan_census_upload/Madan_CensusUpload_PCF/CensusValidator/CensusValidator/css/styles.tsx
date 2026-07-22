import { DefaultPalette, IButtonStyles, IStackStyles, IStackTokens, ITextStyles } from "@fluentui/react";

// Styles definition
export const stackStyles: IStackStyles = {
  root: {
    background: DefaultPalette.white,
    width: 800,
   
  },
  
};
export const itemStyles: React.CSSProperties = {
  alignItems: 'center',
  background: DefaultPalette.themePrimary,
  color: DefaultPalette.white,
  display: 'flex',
  height: 50,
  justifyContent: 'center',
  width: 50,
};

export const SpanStyle: React.CSSProperties = {
  
  fontSize: 11,
  fontWeight:"bold"
};

export const ButtonStyle: React.CSSProperties = {
  alignItems: 'center',
  background: "#1b61ecff",
  color: DefaultPalette.white,
  display: 'flex',
  height: 30,
//   justifyContent: 'center',
  width: 110,
  border:0
};

// Tokens definition
export const sectionStackTokens: IStackTokens = { childrenGap: 10 };

export const TopStackStyle: React.CSSProperties = {
  alignItems: 'center',
  background: "#EBEDF1",
  color: DefaultPalette.black,
  display: 'flex',
 
  border:3
};


export const numericalSpacingStackTokens: IStackTokens = {
  childrenGap: 10,
  padding: 10,
};
export const customSpacingStackTokens: IStackTokens = {
  childrenGap: '10%',
  padding: 's1 15%',
};
export const themedExtraSmallStackTokens: IStackTokens = {
  childrenGap: 's2',
  padding: 's2',
};
export const themedSmallStackTokens: IStackTokens = {
  childrenGap: 's1',
  padding: 's1',
};
export const themedMediumStackTokens: IStackTokens = {
  childrenGap: 'm',
  padding: 'm',
};
export const themedLargeStackTokens: IStackTokens = {
  childrenGap: 'l1',
  padding: 'l1',
};
export const themedExtraLargeStackTokens: IStackTokens = {
  childrenGap: 'l2',
  padding: 'l2',
};



 export   const line1Styles: ITextStyles = {
        root: {
            fontSize:   14,
            fontWeight: 600,
            color:      "#323130",
            display:    "block",
            textAlign:  "left"
        }
    };

  export  const line2Styles: ITextStyles = {
        root: {
            fontSize:  12,
            color:     "#605e5c",
            display:   "block",
            textAlign: "left",
            marginTop: 4
        }
    };

  export  const containerStyles: IStackStyles = {
        root: {
            width:      "100%",
            padding:    "8px 12px",
            background: "#ffffff",
            border:     "1px solid #edebe9",
            borderRadius: 4
        }
    };

  export  const labelRowStyles: IStackStyles = {
        root: {
            width:      "100%",
            padding:    "4px 0"
        }
    };

  export  const buttonRowStyles: IStackStyles = {
        root: {
            width:      "100%",
            padding:    "8px 0 4px 0"
        }
    };

  export  const buttonStyles: IButtonStyles = {
        root: {
            minWidth:     120,
            borderRadius: 2
        }
    };

  export  const stackTokens: IStackTokens = {
        childrenGap: 8
    };
