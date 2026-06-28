import * as React from "react";

export const ProductDetails = ({ data }: any) => {

    const categories =
        data?.productSelectionResponse?.categories?.categories || [];

    const firstCategory = categories[0];

    return (

        <div className="section">

            <h3 className="section-title">Product Details</h3>

            <div className="product-table">

                <div className="product-row">
                    <div className="product-label">Plan Type</div>
                    <div className="product-value">
                        {data?.planType}
                    </div>
                </div>

                <div className="product-row">
                    <div className="product-label">Coverage Type</div>
                    <div className="product-value">
                        {data?.coverageType || "Comprehensive"}
                    </div>
                </div>

                <div className="product-row">
                    <div className="product-label">Network</div>
                    <div className="product-value">
                        {firstCategory?.networkProvider || "Premium Network"}
                    </div>
                </div>

                <div className="product-row">
                    <div className="product-label">
                        Maternity Coverage
                    </div>

                    <div className="product-value">
                        Included
                    </div>
                </div>

            </div>

        </div>
    );
};