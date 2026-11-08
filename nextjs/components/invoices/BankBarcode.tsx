import { bankBarcodeBars } from "@/utilities/bankBarcode";

/**
 * The bank barcode (pankkiviivakoodi) as printed bars, from the invoice's
 * virtual barcode digits. Finance Finland's Bank Bar Code Guide: 70–105 mm
 * long (the banks' readers prefer 105), 10–12.7 mm high, 20 mm of empty
 * space on both sides, centred, and no text directly above or below it.
 * On screen it shrinks to fit; printed it is 105 × 12 mm.
 */
const BankBarcode = ({ digits }: { digits: string }) => {
  const symbol = bankBarcodeBars(digits);
  if (!symbol) return null;
  return (
    <div className="mt-[6mm] mb-[5mm] flex justify-center print:px-[20mm]">
      <svg
        role="img"
        aria-label="Pankkiviivakoodi"
        viewBox={`0 0 ${symbol.modules} 1`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        className="block h-[12mm] w-[105mm] max-w-full bg-white"
      >
        {symbol.bars.map((bar) => (
          <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={1} fill="#000" />
        ))}
      </svg>
    </div>
  );
};

export default BankBarcode;
