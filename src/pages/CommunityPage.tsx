import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  Search,
  MessageCircle,
  Crown,
  Lock,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subject: string;
  created_by: string;
  is_private: boolean;
  max_members: number;
  member_count?: number;
  is_member?: boolean;
}

interface GroupMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user_name?: string;
}

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    subject: '',
    is_private: false
  });

  useEffect(() => {
    loadGroups();
    checkSubscription();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup.id);
      
      // Subscribe to real-time messages
      const channel = supabase
        .channel(`group-${selectedGroup.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'study_group_messages',
          filter: `group_id=eq.${selectedGroup.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as GroupMessage]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedGroup]);

  const checkSubscription = async () => {
    // DEV MODE: Bypass subscription check - treat all users as premium
    setIsPremium(true);
    return;
    
    // Original subscription check (disabled for development)
    // const { data } = await supabase
    //   .from('subscriptions')
    //   .select('*')
    //   .eq('user_id', user?.id)
    //   .eq('status', 'active')
    //   .maybeSingle();
    // setIsPremium(data?.plan === 'pro' || data?.plan === 'premium' || data?.plan === 'academy');
  };

  const loadGroups = async () => {
    setIsLoading(true);
    const { data: groupsData, error } = await supabase
      .from('study_groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load groups" });
      setIsLoading(false);
      return;
    }

    // Get member counts and membership status
    const groupsWithDetails = await Promise.all((groupsData || []).map(async (group) => {
      const { count } = await supabase
        .from('study_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id);

      const { data: membership } = await supabase
        .from('study_group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user?.id)
        .maybeSingle();

      return {
        ...group,
        member_count: count || 0,
        is_member: !!membership
      };
    }));

    setGroups(groupsWithDetails);
    setIsLoading(false);
  };

  const loadMessages = async (groupId: string) => {
    const { data } = await supabase
      .from('study_group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100);

    setMessages(data || []);
  };

  const createGroup = async () => {
    if (!newGroup.name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Group name is required" });
      return;
    }

    const { error } = await supabase
      .from('study_groups')
      .insert({
        name: newGroup.name,
        description: newGroup.description,
        subject: newGroup.subject,
        is_private: newGroup.is_private,
        created_by: user?.id
      });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create group" });
      return;
    }

    toast({ title: "Success", description: "Group created successfully" });
    setShowCreateDialog(false);
    setNewGroup({ name: '', description: '', subject: '', is_private: false });
    loadGroups();
  };

  const joinGroup = async (group: StudyGroup) => {
    const { error } = await supabase
      .from('study_group_members')
      .insert({
        group_id: group.id,
        user_id: user?.id,
        role: 'member'
      });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to join group" });
      return;
    }

    toast({ title: "Success", description: `Joined ${group.name}` });
    loadGroups();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return;

    const { error } = await supabase
      .from('study_group_messages')
      .insert({
        group_id: selectedGroup.id,
        user_id: user?.id,
        content: newMessage
      });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to send message" });
      return;
    }

    setNewMessage('');
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isPremium) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col min-h-screen py-6 safe-top">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Community</h1>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-warning" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Pro Feature</h2>
            <p className="text-muted-foreground mb-6">
              Upgrade to Pro to connect with study groups and collaborate with fellow students.
            </p>
            <Button onClick={() => navigate('/subscription')} className="gradient-primary">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (selectedGroup) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex flex-col h-screen py-6 safe-top">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setSelectedGroup(null)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{selectedGroup.name}</h1>
              <p className="text-xs text-muted-foreground">{selectedGroup.member_count} members</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[80%] p-3 rounded-2xl",
                  msg.user_id === user?.id
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-card border border-border/50"
                )}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-[10px] opacity-70 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage} className="gradient-primary">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showNav={false}>
      <div className="flex flex-col min-h-screen py-6 safe-top">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Community</h1>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary">
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Study Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Group Name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                />
                <Input
                  placeholder="Subject (e.g., Constitutional Law)"
                  value={newGroup.subject}
                  onChange={(e) => setNewGroup({ ...newGroup, subject: e.target.value })}
                />
                <Textarea
                  placeholder="Description"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                />
                <Button onClick={createGroup} className="w-full gradient-primary">
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="bg-card rounded-2xl p-4 border border-border/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{group.name}</h3>
                    {group.subject && (
                      <span className="text-xs text-primary">{group.subject}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {group.member_count}
                  </div>
                </div>
                
                {group.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {group.description}
                  </p>
                )}

                {group.is_member ? (
                  <Button
                    onClick={() => setSelectedGroup(group)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Open Chat
                  </Button>
                ) : (
                  <Button
                    onClick={() => joinGroup(group)}
                    size="sm"
                    className="w-full gradient-primary"
                  >
                    Join Group
                  </Button>
                )}
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No groups found</p>
                <Button onClick={() => setShowCreateDialog(true)} variant="link" className="mt-2">
                  Create the first one
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default CommunityPage;
