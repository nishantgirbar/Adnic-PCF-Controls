export const roundToTwoDecimals = (value: any): number => {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
        return numberValue;
    }

    return Math.round(
        (numberValue + Number.EPSILON) * 100
    ) / 100;
};

export const formatDecimalValue = (value: any): any => {
    const isNumeric =
        typeof value === "number" ||
        (
            typeof value === "string" &&
            value.trim() !== "" &&
            /^[-+]?\d+(?:\.\d+)?$/.test(value.trim())
        );

    if (!isNumeric) {
        return value;
    }

    const roundedValue = roundToTwoDecimals(value);

    return Number.isFinite(roundedValue)
        ? roundedValue.toLocaleString(
            "en-US",
            { maximumFractionDigits: 2 }
        )
        : value;
};
