import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { AlertCircle, Camera, Eye, EyeOff, ImagePlus, Trash2, UserRound, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const connectionMessage = 'ยังไม่เชื่อมต่อระบบเดิม จึงยังไม่สามารถบันทึกข้อมูลได้';

export function PageHeading({ title, eyebrow, description, icon: Icon, children }: { title: string; eyebrow: string; description: string; icon: LucideIcon; children?: ReactNode }) {
  return (
    <div className="page-heading gap-4">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children ?? <span className="heading-icon"><Icon size={25}/></span>}
    </div>
  );
}

export function Field({ label, id, ...props }: ComponentProps<typeof Input> & { label: string; id: string }) {
  return (
    <div className="space-y-2 min-w-0">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="h-11 bg-card" {...props}/>
    </div>
  );
}

export function PasswordField({ label, id, ...props }: ComponentProps<typeof Input> & { label: string; id: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={visible ? 'text' : 'password'} className="h-11 pr-12 bg-card" {...props}/>
        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" aria-label={visible ? `ซ่อน${label}` : `แสดง${label}`} title={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff/> : <Eye/>}
        </Button>
      </div>
    </div>
  );
}

export function Choice({ label, id, value, onChange, options }: { label: string; id: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-2 min-w-0">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 bg-card"><SelectValue/></SelectTrigger>
        <SelectContent>
          {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) { 
  return (
    <div role="status" className="notice">
      <AlertCircle size={17} className="shrink-0"/>
      <span>{children}</span>
    </div>
  ); 
}

export function ImageUpload({ portrait = false, value, onChange }: { portrait?: boolean; value?: string; onChange?: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(value || '');

  useEffect(() => {
    setPreview(value || '');
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreview(base64String);
      if (onChange) {
        onChange(base64String);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleClear = () => {
    setFile(null);
    setPreview('');
    if (onChange) onChange('');
  };

  return (
    <div className={`upload-row ${portrait ? 'portrait-upload' : ''}`}>
      <div className={portrait ? 'avatar-preview' : 'menu-preview'}>
        {preview ? (
          <img src={preview} alt={portrait ? 'รูปโปรไฟล์ที่เลือก' : 'รูปอาหารที่เลือก'} className="w-full h-full object-cover rounded-full" />
        ) : portrait ? (
          <UserRound size={30}/>
        ) : (
          <ImagePlus size={30}/>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-medium mb-2">{portrait ? 'รูปโปรไฟล์' : 'รูปภาพเมนู'}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => input.current?.click()}><Camera/>เลือกรูปภาพ</Button>
          {(file || preview) && <Button type="button" size="icon" variant="ghost" aria-label="ลบรูปภาพ" title="ลบรูปภาพ" onClick={handleClear}><Trash2/></Button>}
        </div>
        {file && <p className="text-xs text-muted-foreground mt-2 truncate max-w-48">{file.name}</p>}
        <input ref={input} type="file" accept="image/*" aria-label={portrait ? 'เลือกรูปโปรไฟล์' : 'เลือกรูปอาหาร'} className="hidden" onChange={handleFileChange}/>
      </div>
    </div>
  );
}

export function EmptyData({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) { 
  return (
    <div className="data-empty">
      <span className="empty-icon"><Icon size={28}/></span>
      <h3>{title}</h3>
      {children}
    </div>
  ); 
}