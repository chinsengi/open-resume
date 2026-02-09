import { createContext, useContext } from "react";

/**
 * Context to track if we're rendering in PDF mode vs HTML preview mode.
 * This is used by components that need to render differently depending on
 * the target (e.g., Link component renders differently in PDF vs HTML).
 */
export const PDFModeContext = createContext<boolean>(false);

export const usePDFMode = () => useContext(PDFModeContext);
