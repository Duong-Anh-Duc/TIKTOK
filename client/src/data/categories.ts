/**
 * Danh mục sản phẩm TikTok Shop Affiliate
 * Cấu trúc: { label, value, children[] }
 */
import type { Category } from '@/types';

export const CATEGORIES: Category[] = [
  {
    label: 'Đồ gia dụng', value: 'do-gia-dung',
    children: [
      { label: 'Đồ đựng trong nhà', value: 'do-dung-trong-nha' },
      { label: 'Đồ dùng phòng tắm', value: 'do-dung-phong-tam' },
      { label: 'Trang trí nội thất', value: 'trang-tri-noi-that' },
      { label: 'Đồ gia dụng', value: 'do-gia-dung-sub' },
      { label: 'Dụng cụ & phụ kiện giặt là', value: 'dung-cu-giat-la' },
      { label: 'Đồ dùng cho lễ hội & bữa tiệc', value: 'do-dung-le-hoi' },
      { label: 'Đồ gia dụng khác', value: 'do-gia-dung-khac' },
    ],
  },
  {
    label: 'Đồ dùng nhà bếp', value: 'do-dung-nha-bep',
    children: [
      { label: 'Đồ để uống trà & cà phê', value: 'do-uong-tra-ca-phe' },
      { label: 'Dao nhà bếp', value: 'dao-nha-bep' },
      { label: 'Tiệc nướng barbecue', value: 'tiec-nuong-bbq' },
      { label: 'Đồ dùng quầy rượu & Đồ uống rượu', value: 'do-dung-quay-ruou' },
      { label: 'Đồ làm bánh', value: 'do-lam-banh' },
      { label: 'Đồ nấu ăn', value: 'do-nau-an' },
      { label: 'Dao kéo & Bộ đồ ăn', value: 'dao-keo-bo-do-an' },
      { label: 'Bộ đồ uống', value: 'bo-do-uong' },
      { label: 'Đồ dùng & Dụng cụ nhà bếp', value: 'do-dung-dung-cu-bep' },
    ],
  },
  {
    label: 'Hàng dệt & Đồ nội thất mềm', value: 'hang-det-noi-that-mem',
    children: [
      { label: 'Chăn ga gối đệm', value: 'chan-ga-goi-dem' },
      { label: 'Hàng dệt gia dụng', value: 'hang-det-gia-dung' },
      { label: 'Vải & Đồ may', value: 'vai-do-may' },
    ],
  },
  {
    label: 'Thiết bị gia dụng', value: 'thiet-bi-gia-dung',
    children: [
      { label: 'Dụng cụ nhà bếp', value: 'dung-cu-nha-bep-tb' },
      { label: 'Đồ gia dụng', value: 'do-gia-dung-tb' },
      { label: 'Đồ gia dụng lớn', value: 'do-gia-dung-lon' },
      { label: 'Thiết bị thương mại', value: 'thiet-bi-thuong-mai' },
    ],
  },
  {
    label: 'Trang phục nữ & Đồ lót', value: 'trang-phuc-nu',
    children: [
      { label: 'Áo nữ', value: 'ao-nu' },
      { label: 'Quần nữ', value: 'quan-nu' },
      { label: 'Váy nữ', value: 'vay-nu' },
      { label: 'Trang phục đặc biệt dành cho nữ', value: 'trang-phuc-dac-biet-nu' },
      { label: 'Bộ vét và quần yếm nữ', value: 'bo-vet-quan-yem-nu' },
      { label: 'Đồ lót nữ', value: 'do-lot-nu' },
      { label: 'Đồ ngủ & đồ mặc nhà cho nữ', value: 'do-ngu-mac-nha-nu' },
    ],
  },
  {
    label: 'Thời trang Hồi giáo', value: 'thoi-trang-hoi-giao',
    children: [
      { label: 'Khăn trùm đầu che đầu và cổ (Hijab)', value: 'hijab' },
      { label: 'Trang phục phụ nữ Hồi giáo', value: 'trang-phuc-nu-hg' },
      { label: 'Trang phục đàn ông Hồi giáo', value: 'trang-phuc-nam-hg' },
      { label: 'Đồ mặc ngoài', value: 'do-mac-ngoai-hg' },
      { label: 'Trang phục trẻ em Hồi giáo', value: 'trang-phuc-tre-em-hg' },
      { label: 'Phụ kiện Hồi giáo', value: 'phu-kien-hg' },
      { label: 'Trang phục & trang bị cầu nguyện', value: 'trang-phuc-cau-nguyen' },
      { label: 'Đồ thể thao Hồi giáo', value: 'do-the-thao-hg' },
      { label: 'Thiết bị Umroh', value: 'thiet-bi-umroh' },
    ],
  },
  {
    label: 'Giày', value: 'giay',
    children: [
      { label: 'Giày nữ', value: 'giay-nu' },
      { label: 'Giày nam', value: 'giay-nam' },
      { label: 'Phụ kiện giày', value: 'phu-kien-giay' },
    ],
  },
  {
    label: 'Chăm sóc sắc đẹp & Chăm sóc cá nhân', value: 'cham-soc-sac-dep',
    children: [
      { label: 'Trang điểm', value: 'trang-diem' },
      { label: 'Chăm sóc da', value: 'cham-soc-da' },
      { label: 'Chăm sóc & Tạo kiểu tóc', value: 'cham-soc-tao-kieu-toc' },
      { label: 'Chăm sóc Tay & Chân', value: 'cham-soc-tay-chan' },
      { label: 'Đồ tắm & Chăm sóc cơ thể', value: 'do-tam-cham-soc-co-the' },
      { label: 'Sản phẩm chăm sóc dành cho nam giới', value: 'cham-soc-nam' },
      { label: 'Thiết bị chăm sóc cá nhân', value: 'thiet-bi-cham-soc-ca-nhan' },
      { label: 'Chăm sóc mắt & tai', value: 'cham-soc-mat-tai' },
      { label: 'Chăm sóc mũi & răng miệng', value: 'cham-soc-mui-rang' },
      { label: 'Sản phẩm chăm sóc dành cho phụ nữ', value: 'cham-soc-phu-nu' },
      { label: 'Nước hoa', value: 'nuoc-hoa' },
      { label: 'Chăm sóc cá nhân đặc biệt', value: 'cham-soc-dac-biet' },
      { label: 'Chăm sóc móng tay', value: 'cham-soc-mong-tay' },
    ],
  },
  {
    label: 'Điện thoại & Đồ điện tử', value: 'dien-thoai-do-dien-tu',
    children: [
      { label: 'Phụ kiện điện thoại', value: 'phu-kien-dien-thoai' },
      { label: 'Camera & Nhiếp ảnh', value: 'camera-nhiep-anh' },
      { label: 'Âm thanh & Video', value: 'am-thanh-video' },
      { label: 'Chơi game & Bảng điều khiển', value: 'choi-game-bang-dieu-khien' },
      { label: 'Thiết bị thông minh & Thiết bị đeo', value: 'thiet-bi-thong-minh-deo' },
      { label: 'Thiết bị giáo dục', value: 'thiet-bi-giao-duc' },
      { label: 'Phụ kiện đa năng', value: 'phu-kien-da-nang' },
      { label: 'Phụ kiện máy tính bảng & máy tính', value: 'phu-kien-may-tinh-bang' },
      { label: 'Điện thoại & Máy tính bảng', value: 'dien-thoai-may-tinh-bang' },
    ],
  },
  {
    label: 'Máy tính & Thiết bị Văn phòng', value: 'may-tinh-thiet-bi-van-phong',
    children: [
      { label: 'Máy tính để bàn, Máy tính xách tay & Máy tính bảng', value: 'may-tinh-de-ban' },
      { label: 'Linh kiện máy tính để bàn & máy tính xách tay', value: 'linh-kien-may-tinh' },
      { label: 'Thiết bị ngoại vi & Phụ kiện', value: 'thiet-bi-ngoai-vi' },
      { label: 'Phần mềm & Bộ nhớ', value: 'phan-mem-bo-nho' },
      { label: 'Các thành phần mạng', value: 'thanh-phan-mang' },
      { label: 'Thiết bị văn phòng', value: 'thiet-bi-van-phong' },
      { label: 'Văn phòng phẩm & Vật tư', value: 'van-phong-pham' },
    ],
  },
  {
    label: 'Đồ dùng cho thú cưng', value: 'do-dung-thu-cung',
    children: [
      { label: 'Thức ăn cho chó & mèo', value: 'thuc-an-cho-meo' },
      { label: 'Nội thất cho chó & mèo', value: 'noi-that-cho-meo' },
      { label: 'Quần áo cho chó & mèo', value: 'quan-ao-cho-meo' },
      { label: 'Cát vệ sinh cho chó & mèo', value: 'cat-ve-sinh-cho-meo' },
      { label: 'Đồ chải chuốt cho chó & mèo', value: 'do-chai-chuot-cho-meo' },
      { label: 'Chăm sóc sức khỏe cho chó & mèo', value: 'cham-soc-suc-khoe-cho-meo' },
      { label: 'Phụ kiện cho chó & mèo', value: 'phu-kien-cho-meo' },
      { label: 'Vật tư dành cho cá & loài sống dưới nước', value: 'vat-tu-ca-duoi-nuoc' },
      { label: 'Vật tư dành cho bò sát & động vật lưỡng cư', value: 'vat-tu-bo-sat' },
      { label: 'Vật tư dành cho chim', value: 'vat-tu-chim' },
      { label: 'Vật tư dành cho động vật nhỏ', value: 'vat-tu-dong-vat-nho' },
      { label: 'Vật tư cho gia cầm & gia súc', value: 'vat-tu-gia-cam-gia-suc' },
    ],
  },
  {
    label: 'Trẻ sơ sinh & thai sản', value: 'tre-so-sinh-thai-san',
    children: [
      { label: 'Quần áo & Giày trẻ em', value: 'quan-ao-giay-tre-em' },
      { label: 'Những vật dụng cần thiết khi cho bé đi du lịch', value: 'vat-dung-be-du-lich' },
      { label: 'Cho bú & Cho ăn', value: 'cho-bu-cho-an' },
      { label: 'Nội thất cho trẻ em', value: 'noi-that-tre-em' },
      { label: 'An toàn cho bé', value: 'an-toan-cho-be' },
      { label: 'Đồ chơi trẻ em', value: 'do-choi-tre-em' },
      { label: 'Chăm sóc bé & sức khỏe', value: 'cham-soc-be-suc-khoe' },
      { label: 'Sữa công thức & Thực phẩm cho trẻ', value: 'sua-cong-thuc' },
      { label: 'Vật tư cho mẹ', value: 'vat-tu-cho-me' },
      { label: 'Phụ kiện thời trang cho em bé', value: 'phu-kien-thoi-trang-be' },
    ],
  },
  {
    label: 'Thể thao & Ngoài trời', value: 'the-thao-ngoai-troi',
    children: [
      { label: 'Đồ thể thao & ngoài trời', value: 'do-the-thao-ngoai-troi' },
      { label: 'Giày thể thao', value: 'giay-the-thao' },
      { label: 'Phụ kiện thể thao & ngoài trời', value: 'phu-kien-the-thao' },
      { label: 'Thiết bị các môn thể thao bóng', value: 'thiet-bi-the-thao-bong' },
      { label: 'Thiết bị thể thao dưới nước', value: 'thiet-bi-the-thao-duoi-nuoc' },
      { label: 'Thiết bị thể thao mùa đông', value: 'thiet-bi-the-thao-mua-dong' },
      { label: 'Thiết bị tập thể hình', value: 'thiet-bi-tap-the-hinh' },
      { label: 'Thiết bị cắm trại & đi bộ đường dài', value: 'thiet-bi-cam-trai' },
      { label: 'Thiết bị giải trí ngoài trời & thư giãn', value: 'thiet-bi-giai-tri-ngoai-troi' },
      { label: 'Đồ bơi, đồ lướt sóng & đồ lặn', value: 'do-boi-luot-song' },
      { label: 'Cửa hàng dành cho người hâm mộ', value: 'cua-hang-nguoi-ham-mo' },
    ],
  },
  {
    label: 'Đồ chơi & sở thích', value: 'do-choi-so-thich',
    children: [
      { label: 'Búp bê & Gấu bông', value: 'bup-be-gau-bong' },
      { label: 'Đồ chơi giáo dục', value: 'do-choi-giao-duc' },
      { label: 'Đồ chơi thể thao & ngoài trời', value: 'do-choi-the-thao' },
      { label: 'Đồ chơi điện & điều khiển từ xa', value: 'do-choi-dien-dieu-khien' },
      { label: 'Trò chơi & Ghép hình', value: 'tro-choi-ghep-hinh' },
      { label: 'Đồ chơi cổ điển & mới lạ', value: 'do-choi-co-dien' },
      { label: 'Nhạc cụ & Phụ kiện', value: 'nhac-cu-phu-kien' },
      { label: 'DIY', value: 'diy' },
    ],
  },
  {
    label: 'Đồ nội thất', value: 'do-noi-that',
    children: [
      { label: 'Nội thất trong nhà', value: 'noi-that-trong-nha' },
      { label: 'Nội thất ngoài trời', value: 'noi-that-ngoai-troi' },
      { label: 'Nội thất trẻ em', value: 'noi-that-tre-em-nt' },
      { label: 'Nội thất thương mại', value: 'noi-that-thuong-mai' },
    ],
  },
  {
    label: 'Công cụ & Phần cứng', value: 'cong-cu-phan-cung',
    children: [
      { label: 'Dụng cụ điện', value: 'dung-cu-dien' },
      { label: 'Dụng cụ cầm tay', value: 'dung-cu-cam-tay' },
      { label: 'Dụng cụ đo lường', value: 'dung-cu-do-luong' },
      { label: 'Dụng cụ làm vườn', value: 'dung-cu-lam-vuon' },
      { label: 'Thiết bị hàn', value: 'thiet-bi-han' },
      { label: 'Bộ sắp xếp dụng cụ', value: 'bo-sap-xep-dung-cu' },
      { label: 'Phần cứng', value: 'phan-cung' },
      { label: 'Máy bơm & Hệ thống đường ống', value: 'may-bom-he-thong-duong-ong' },
    ],
  },
  {
    label: 'Sửa chữa nhà cửa', value: 'sua-chua-nha-cua',
    children: [
      { label: 'Năng lượng mặt trời & gió', value: 'nang-luong-mat-troi' },
      { label: 'Đèn & hệ thống chiếu sáng', value: 'den-chieu-sang' },
      { label: 'Đồ dùng & thiết bị điện', value: 'do-dung-thiet-bi-dien' },
      { label: 'Đồ đạc nhà bếp', value: 'do-dac-nha-bep' },
      { label: 'Hệ thống nhà thông minh', value: 'he-thong-nha-thong-minh' },
      { label: 'Vật tư xây dựng', value: 'vat-tu-xay-dung' },
      { label: 'Đồ đạc nhà tắm', value: 'do-dac-nha-tam' },
      { label: 'An ninh & An toàn', value: 'an-ninh-an-toan' },
      { label: 'Vật dụng làm vườn', value: 'vat-dung-lam-vuon' },
    ],
  },
  {
    label: 'Ô tô & xe máy', value: 'o-to-xe-may',
    children: [
      { label: 'Bộ phận thay thế cho ô tô', value: 'bo-phan-thay-the-oto' },
      { label: 'Linh kiện mô tô', value: 'linh-kien-mo-to' },
      { label: 'Thiết bị điện tử trên ô tô', value: 'thiet-bi-dien-tu-oto' },
      { label: 'Phụ kiện bên ngoài ô tô', value: 'phu-kien-ben-ngoai-oto' },
      { label: 'Phụ kiện bên trong ô tô', value: 'phu-kien-ben-trong-oto' },
      { label: 'Dụng cụ sửa chữa ô tô', value: 'dung-cu-sua-chua-oto' },
      { label: 'Đèn xe', value: 'den-xe' },
      { label: 'Xe Quads, Xe lưu động & Thuyền', value: 'xe-quads-thuyen' },
      { label: 'Rửa & Bảo dưỡng ô tô', value: 'rua-bao-duong-oto' },
      { label: 'Phụ kiện xe máy', value: 'phu-kien-xe-may' },
    ],
  },
  {
    label: 'Phụ kiện thời trang', value: 'phu-kien-thoi-trang',
    children: [
      { label: 'Nối tóc & tóc giả', value: 'noi-toc-toc-gia' },
      { label: 'Vải may váy', value: 'vai-may-vay' },
      { label: 'Phụ kiện đám cưới', value: 'phu-kien-dam-cuoi' },
      { label: 'Phụ kiện quần áo', value: 'phu-kien-quan-ao' },
      { label: 'Kính mắt', value: 'kinh-mat' },
      { label: 'Đồng hồ & Phụ kiện', value: 'dong-ho-phu-kien' },
      { label: 'Phục sức & phụ kiện', value: 'phuc-suc-phu-kien' },
      { label: 'Phụ kiện cài đầu', value: 'phu-kien-cai-dau' },
    ],
  },
  {
    label: 'Đồ ăn & Đồ uống', value: 'do-an-do-uong',
    children: [
      { label: 'Sữa và bơ sữa', value: 'sua-bo-sua' },
      { label: 'Đồ uống', value: 'do-uong' },
      { label: 'Thực phẩm ăn liền', value: 'thuc-pham-an-lien' },
      { label: 'Kẹp & Đồ dùng nấu ăn cần thiết', value: 'kep-do-dung-nau-an' },
      { label: 'Nướng bánh', value: 'nuong-banh' },
      { label: 'Đồ ăn vặt', value: 'do-an-vat' },
    ],
  },
  {
    label: 'Sức khỏe', value: 'suc-khoe',
    children: [
      { label: 'Thực phẩm bổ sung', value: 'thuc-pham-bo-sung' },
      { label: 'Vật tư y tế', value: 'vat-tu-y-te' },
      { label: 'Thuốc & Phương pháp điều trị thay thế', value: 'thuoc-dieu-tri' },
    ],
  },
  {
    label: 'Thời trang trẻ em', value: 'thoi-trang-tre-em',
    children: [
      { label: 'Quần áo bé trai', value: 'quan-ao-be-trai' },
      { label: 'Quần áo bé gái', value: 'quan-ao-be-gai' },
      { label: 'Giày dép bé trai', value: 'giay-dep-be-trai' },
      { label: 'Giày dép bé gái', value: 'giay-dep-be-gai' },
      { label: 'Phụ kiện thời trang cho trẻ em', value: 'phu-kien-thoi-trang-tre-em' },
    ],
  },
  {
    label: 'Trang phục nam & Đồ lót', value: 'trang-phuc-nam',
    children: [
      { label: 'Áo nam', value: 'ao-nam' },
      { label: 'Quần nam', value: 'quan-nam' },
      { label: 'Trang phục đặc biệt dành cho nam', value: 'trang-phuc-dac-biet-nam' },
      { label: 'Đồ lót nam', value: 'do-lot-nam' },
      { label: 'Đồ ngủ & đồ mặc nhà cho nam', value: 'do-ngu-mac-nha-nam' },
      { label: 'Bộ vét và quần yếm nam', value: 'bo-vet-quan-yem-nam' },
    ],
  },
  {
    label: 'Hành lý & Túi xách', value: 'hanh-ly-tui-xach',
    children: [
      { label: 'Túi xách nữ', value: 'tui-xach-nu' },
      { label: 'Túi xách nam', value: 'tui-xach-nam' },
      { label: 'Hành lý & Túi du lịch', value: 'hanh-ly-tui-du-lich' },
      { label: 'Túi đa năng', value: 'tui-da-nang' },
      { label: 'Phụ kiện túi', value: 'phu-kien-tui' },
    ],
  },
  { label: 'Sản phẩm trực tuyến', value: 'san-pham-truc-tuyen', children: [{ label: 'Voucher', value: 'voucher' }] },
  {
    label: 'Bộ sưu tập', value: 'bo-suu-tap',
    children: [
      { label: 'Bộ sưu tập văn hóa đương đại', value: 'bo-suu-tap-van-hoa' },
      { label: 'Khung giường & đầu giường', value: 'khung-giuong-dau-giuong' },
      { label: 'Bộ sưu tập thể thao', value: 'bo-suu-tap-the-thao' },
      { label: 'Giải trí', value: 'giai-tri' },
    ],
  },
  {
    label: 'Phụ kiện trang sức & Phái sinh', value: 'phu-kien-trang-suc',
    children: [
      { label: 'Pha lê không tự nhiên', value: 'pha-le-khong-tu-nhien' },
      { label: 'Đá bán quý', value: 'da-ban-quy' },
      { label: 'Đá quý nhân tạo', value: 'da-quy-nhan-tao' },
      { label: 'Ngọc trai', value: 'ngoc-trai' },
      { label: 'Hổ phách', value: 'ho-phach' },
      { label: 'Mellite', value: 'mellite' },
    ],
  },
];

/** Loại nội dung */
export const CONTENT_TYPES = [
  { label: 'Tất cả', value: '' },
  { label: 'Video', value: 'video' },
  { label: 'LIVE', value: 'live' },
];

/** GMV filter — dùng ₫ (Unicode 8363) giống TikTok */
export const GMV_OPTIONS = [
  { label: '0-50K\u20AB', value: '0-50K' },
  { label: '50K\u20AB-100K\u20AB', value: '50K-100K' },
  { label: '100K\u20AB-500K\u20AB', value: '100K-500K' },
  { label: '500K\u20AB-1M\u20AB', value: '500K-1M' },
  { label: '1M\u20AB+', value: '1M+' },
];

/** Số món bán ra filter */
export const ITEMS_SOLD_OPTIONS = [
  { label: '0-10', value: '0-10' },
  { label: '10-100', value: '10-100' },
  { label: '100-1.000', value: '100-1000' },
  { label: '1.000+', value: '1000+' },
];
