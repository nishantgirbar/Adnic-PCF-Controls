import * as React from "react";
import "../css/CensusUploadControl.css";

export interface IUploadSectionProps {
    loading: boolean;
    onUpload: (file: File) => void;
    onDownloadTemplate: () => void;
}

export const UploadSection: React.FC<IUploadSectionProps> = ({
    loading,
    onUpload,
    onDownloadTemplate
}) => {

    const [isDragging, setIsDragging] =
        React.useState(false);

    const fileInputRef =
        React.useRef<HTMLInputElement>(null);

    const handleFileSelect = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {

        const files =
            event.target.files;

        if (
            files &&
            files.length > 0
        ) {

            onUpload(
                files[0]
            );
        }
    };

    const handleDrop = (
        event: React.DragEvent<HTMLDivElement>
    ) => {

        event.preventDefault();

        setIsDragging(false);

        const files =
            event.dataTransfer.files;

        if (
            files &&
            files.length > 0
        ) {

            onUpload(
                files[0]
            );
        }
    };

    const handleDragOver = (
        event: React.DragEvent<HTMLDivElement>
    ) => {

        event.preventDefault();
    };

    const handleDragEnter = (
        event: React.DragEvent<HTMLDivElement>
    ) => {

        event.preventDefault();

        setIsDragging(true);
    };

    const handleDragLeave = (
        event: React.DragEvent<HTMLDivElement>
    ) => {

        event.preventDefault();

        setIsDragging(false);
    };

    const openFilePicker = () => {

        fileInputRef.current?.click();
    };

    return (

        <div className="upload-section">

           <div className="upload-toolbar">

               Census Upload : 

                <button
                    type="button"
                    className="upload-btn"
                    onClick={
                        openFilePicker
                    }
                    disabled={loading}
                >
                    {
                        loading
                            ? "Uploading..."
                            : "Upload Census"
                    }
                </button>

            </div>

           
            <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={
                    handleFileSelect
                }
            />

            {
                loading &&

                <div className="upload-loading">

                    <div className="spinner" />

                    <span>
                        Uploading census file...
                    </span>

                </div>
            }

        </div>
    );
};