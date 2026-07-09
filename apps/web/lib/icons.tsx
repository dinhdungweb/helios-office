import { forwardRef, type SVGProps } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Add01Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Attachment01Icon,
  BankIcon,
  BellIcon,
  BirthdayCakeIcon,
  BookOpen02Icon,
  Bookmark02Icon,
  Briefcase02Icon,
  BubbleChatIcon,
  Building03Icon,
  Calendar03Icon,
  CalendarCheckIcon,
  Cancel01Icon,
  ChartLineData01Icon,
  ChartNetworkIcon,
  Chatting01Icon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  ClipboardListIcon,
  Clock01Icon,
  DashboardSquare02Icon,
  DollarCircleIcon,
  DollarReceive01Icon,
  File02Icon,
  FileExportIcon,
  Flag02Icon,
  FunnelIcon,
  GearsIcon,
  Globe02Icon,
  GraduationCapIcon,
  HeartIcon,
  House02Icon,
  House03Icon,
  IdIcon,
  ImageNotFound01Icon,
  LayoutTwoColumnIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  Link02Icon,
  MagicWand02Icon,
  Mail01Icon,
  MaleSymbolIcon,
  Medal03Icon,
  Megaphone02Icon,
  Menu01Icon,
  MenuCircleIcon,
  Mic01Icon,
  MinusSignIcon,
  Money03Icon,
  PackageIcon,
  PencilEdit02Icon,
  PhoneArrowUpIcon,
  Search01Icon,
  SealIcon,
  SecurityCheckIcon,
  SentIcon,
  Share05Icon,
  SlidersHorizontalIcon,
  SmileIcon,
  Speaker01Icon,
  StarIcon,
  Tag01Icon,
  Target02Icon,
  TextAlignLeft01Icon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UmbrellaIcon,
  Upload01Icon,
  UserCircleIcon,
  UserGroupIcon,
  UserMultiple02Icon,
  Wallet02Icon
} from "@hugeicons/core-free-icons";

type LegacyWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "color" | "strokeWidth"> & {
  color?: string;
  size?: string | number;
  strokeWidth?: number;
  weight?: LegacyWeight;
};

export type Icon = ReturnType<typeof createIcon>;

function createIcon(icon: IconSvgElement) {
  return forwardRef<SVGSVGElement, IconProps>(function HugeIconAdapter(
    { size = 20, weight: _weight, strokeWidth = 1.7, ...props },
    ref
  ) {
    return <HugeiconsIcon ref={ref} icon={icon} size={size} strokeWidth={strokeWidth} {...props} />;
  });
}

export const ArrowRight = createIcon(ArrowRight02Icon);
export const ArrowSquareOut = createIcon(ArrowUpRight01Icon);
export const Bank = createIcon(BankIcon);
export const Bell = createIcon(BellIcon);
export const BookOpenText = createIcon(BookOpen02Icon);
export const BookmarkSimple = createIcon(Bookmark02Icon);
export const Briefcase = createIcon(Briefcase02Icon);
export const Buildings = createIcon(Building03Icon);
export const Cake = createIcon(BirthdayCakeIcon);
export const CalendarBlank = createIcon(Calendar03Icon);
export const CalendarCheck = createIcon(CalendarCheckIcon);
export const CaretDown = createIcon(ArrowDown01Icon);
export const CaretLeft = createIcon(ArrowLeft01Icon);
export const CaretRight = createIcon(ArrowRight01Icon);
export const CaretUp = createIcon(ArrowUp01Icon);
export const ChartLineUp = createIcon(ChartLineData01Icon);
export const ChatCircle = createIcon(BubbleChatIcon);
export const ChatCircleText = createIcon(Chatting01Icon);
export const Check = createIcon(CheckmarkBadge01Icon);
export const CheckCircle = createIcon(CheckmarkCircle02Icon);
export const Circle = createIcon(CircleIcon);
export const ClipboardText = createIcon(ClipboardListIcon);
export const Clock = createIcon(Clock01Icon);
export const Columns = createIcon(LayoutTwoColumnIcon);
export const CurrencyDollar = createIcon(DollarCircleIcon);
export const DotsThree = createIcon(MenuCircleIcon);
export const EnvelopeSimple = createIcon(Mail01Icon);
export const Export = createIcon(FileExportIcon);
export const FileText = createIcon(File02Icon);
export const Flag = createIcon(Flag02Icon);
export const FlowArrow = createIcon(ChartNetworkIcon);
export const FunnelSimple = createIcon(FunnelIcon);
export const GearSix = createIcon(GearsIcon);
export const GenderMale = createIcon(MaleSymbolIcon);
export const GlobeHemisphereWest = createIcon(Globe02Icon);
export const GraduationCap = createIcon(GraduationCapIcon);
export const Heart = createIcon(HeartIcon);
export const House = createIcon(House02Icon);
export const HouseLine = createIcon(House03Icon);
export const IdentificationBadge = createIcon(IdIcon);
export const ImageBroken = createIcon(ImageNotFound01Icon);
export const LinkSimple = createIcon(Link02Icon);
export const List = createIcon(Menu01Icon);
export const ListBullets = createIcon(LeftToRightListBulletIcon);
export const ListNumbers = createIcon(LeftToRightListNumberIcon);
export const MagicWand = createIcon(MagicWand02Icon);
export const MagnifyingGlass = createIcon(Search01Icon);
export const Medal = createIcon(Medal03Icon);
export const Megaphone = createIcon(Megaphone02Icon);
export const Microphone = createIcon(Mic01Icon);
export const Minus = createIcon(MinusSignIcon);
export const Money = createIcon(Money03Icon);
export const MoneyWavy = createIcon(DollarReceive01Icon);
export const Network = createIcon(ChartNetworkIcon);
export const Package = createIcon(PackageIcon);
export const PaperPlaneTilt = createIcon(SentIcon);
export const Paperclip = createIcon(Attachment01Icon);
export const PencilSimple = createIcon(PencilEdit02Icon);
export const Phone = createIcon(PhoneArrowUpIcon);
export const Plus = createIcon(Add01Icon);
export const SealCheck = createIcon(SealIcon);
export const ShareFat = createIcon(Share05Icon);
export const ShieldCheck = createIcon(SecurityCheckIcon);
export const SlidersHorizontal = createIcon(SlidersHorizontalIcon);
export const Smiley = createIcon(SmileIcon);
export const SpeakerHigh = createIcon(Speaker01Icon);
export const SquaresFour = createIcon(DashboardSquare02Icon);
export const Star = createIcon(StarIcon);
export const Tag = createIcon(Tag01Icon);
export const Target = createIcon(Target02Icon);
export const TextAlignLeft = createIcon(TextAlignLeft01Icon);
export const TextB = createIcon(TextBoldIcon);
export const TextItalic = createIcon(TextItalicIcon);
export const TextUnderline = createIcon(TextUnderlineIcon);
export const ThumbsDown = createIcon(ThumbsDownIcon);
export const ThumbsUp = createIcon(ThumbsUpIcon);
export const Umbrella = createIcon(UmbrellaIcon);
export const UploadSimple = createIcon(Upload01Icon);
export const UserCircle = createIcon(UserCircleIcon);
export const Users = createIcon(UserGroupIcon);
export const UsersThree = createIcon(UserMultiple02Icon);
export const Wallet = createIcon(Wallet02Icon);
export const WarningCircle = createIcon(AlertCircleIcon);
export const X = createIcon(Cancel01Icon);
