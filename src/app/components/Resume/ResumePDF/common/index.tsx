import { Text, View, Link } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import { DEBUG_RESUME_PDF_FLAG } from "lib/constants";
import { DEFAULT_FONT_COLOR } from "lib/redux/settingsSlice";
import { parseMarkdown } from "lib/parseMarkdown";
import { usePDFMode } from "components/Resume/ResumePDF/PDFModeContext";

export const ResumePDFSection = ({
  themeColor,
  heading,
  style = {},
  children,
}: {
  themeColor?: string;
  heading?: string;
  style?: Style;
  children: React.ReactNode;
}) => (
  <View
    style={{
      ...styles.flexCol,
      gap: spacing["2"],
      marginTop: spacing["5"],
      ...style,
    }}
  >
    {heading && (
      <View style={{ ...styles.flexRow, alignItems: "center" }}>
        {themeColor && (
          <View
            style={{
              height: "3.75pt",
              width: "30pt",
              backgroundColor: themeColor,
              marginRight: spacing["3.5"],
            }}
            debug={DEBUG_RESUME_PDF_FLAG}
          />
        )}
        <Text
          style={{
            fontWeight: "bold",
            letterSpacing: "0.3pt", // tracking-wide -> 0.025em * 12 pt = 0.3pt
          }}
          debug={DEBUG_RESUME_PDF_FLAG}
        >
          {heading}
        </Text>
      </View>
    )}
    {children}
  </View>
);

export const ResumePDFText = ({
  bold = false,
  themeColor,
  style = {},
  children,
}: {
  bold?: boolean;
  themeColor?: string;
  style?: Style;
  children: React.ReactNode;
}) => {
  return (
    <Text
      style={{
        color: themeColor || DEFAULT_FONT_COLOR,
        fontWeight: bold ? "bold" : "normal",
        ...style,
      }}
      debug={DEBUG_RESUME_PDF_FLAG}
    >
      {children}
    </Text>
  );
};

/**
 * Renders markdown-formatted text with support for **bold**, *italic*, and [links](url).
 */
export const ResumePDFMarkdownText = ({
  children,
  style = {},
}: {
  children: string;
  style?: Style;
}) => {
  const isPDF = usePDFMode();
  const tokens = parseMarkdown(children);

  return (
    <Text
      style={{
        color: DEFAULT_FONT_COLOR,
        ...style,
      }}
      debug={DEBUG_RESUME_PDF_FLAG}
    >
      {tokens.map((token, idx) => {
        switch (token.type) {
          case "bold":
            return (
              <Text key={idx} style={{ fontWeight: "bold" }}>
                {token.content}
              </Text>
            );
          case "italic":
            return (
              <Text key={idx} style={{ fontStyle: "italic" }}>
                {token.content}
              </Text>
            );
          case "link":
            if (isPDF) {
              return (
                <Link key={idx} src={token.url} style={{ color: "#0066cc", textDecoration: "underline" }}>
                  {token.content}
                </Link>
              );
            }
            return (
              <a
                key={idx}
                href={token.url}
                style={{ color: "#0066cc", textDecoration: "underline" }}
                target="_blank"
                rel="noreferrer"
              >
                {token.content}
              </a>
            );
          default:
            return <Text key={idx}>{token.content}</Text>;
        }
      })}
    </Text>
  );
};


export const ResumePDFBulletList = ({
  items,
  showBulletPoints = true,
}: {
  items: string[];
  showBulletPoints?: boolean;
}) => {
  const isPDF = usePDFMode();
  // react-pdf's PDF layout engine produces more leading than the browser DOM
  // preview for the same lineHeight value, so use a tighter value for PDF.
  const lineHeight = isPDF ? "0.8" : "1.15";
  return (
    <>
      {items.map((item, idx) => (
        <View style={{ ...styles.flexRow }} key={idx} wrap={false}>
          {showBulletPoints && (
            <ResumePDFText
              style={{
                paddingLeft: spacing["2"],
                paddingRight: spacing["2"],
                lineHeight,
              }}
              bold={true}
            >
              {"•"}
            </ResumePDFText>
          )}
          {/* A breaking change was introduced causing text layout to be wider than node's width
              https://github.com/diegomura/react-pdf/issues/2182. flexGrow & flexBasis fixes it */}
          <ResumePDFMarkdownText
            style={{ lineHeight, flexGrow: 1, flexBasis: 0 }}
          >
            {item}
          </ResumePDFMarkdownText>
        </View>
      ))}
    </>
  );
};

export const ResumePDFLink = ({
  src,
  isPDF,
  children,
}: {
  src: string;
  isPDF: boolean;
  children: React.ReactNode;
}) => {
  if (isPDF) {
    return (
      <Link src={src} style={{ textDecoration: "none" }}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={src}
      style={{ textDecoration: "none" }}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
};

export const ResumeFeaturedSkill = ({
  skill,
  rating,
  themeColor,
  style = {},
}: {
  skill: string;
  rating: number;
  themeColor: string;
  style?: Style;
}) => {
  const numCircles = 5;

  return (
    <View style={{ ...styles.flexRow, alignItems: "center", ...style }}>
      <ResumePDFText style={{ marginRight: spacing[0.5] }}>
        {skill}
      </ResumePDFText>
      {[...Array(numCircles)].map((_, idx) => (
        <View
          key={idx}
          style={{
            height: "9pt",
            width: "9pt",
            marginLeft: "2.25pt",
            backgroundColor: rating >= idx ? themeColor : "#d9d9d9",
            borderRadius: "4.5pt",
          }}
        />
      ))}
    </View>
  );
};
